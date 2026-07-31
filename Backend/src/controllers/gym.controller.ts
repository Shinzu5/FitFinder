import { Request, Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import {
  linkOwnerSubscriptionToGym,
  syncLatestOwnerSubscriptions,
} from "../services/ownerSubscription.service";
import {
  emitAdminGymsUpdated,
  emitAdminUsersUpdated,
  emitMembershipUpdated,
} from "../services/realtime.service";
import { kickUserSession, purgeUserRecords } from "../services/accountRemoval.service";
import { emitToUser } from "../socket";

function isValidXenditKey(key: string): boolean {
  return key.startsWith("xnd_production_") || key.startsWith("xnd_development_");
}

/** Cashless only when owner saved a valid key and left the toggle on. Never leak the key. */
export function isGymCashlessEnabled(gym: any): boolean {
  const key = String(gym?.xenditApiKey || "").trim();
  const enabled = Boolean(gym?.xenditEnabled);
  return Boolean(enabled && isValidXenditKey(key));
}

function toPublicGym(gym: any) {
  const { xenditApiKey: _omitKey, xenditEnabled: _omitEnabled, ...rest } = gym;
  return {
    ...rest,
    cashlessEnabled: isGymCashlessEnabled(gym),
  };
}

// GET /api/gyms — list active gyms (public)
export async function listGyms(req: Request, res: Response): Promise<void> {
  try {
    // Auto-publish any legacy PENDING gyms (admin approval removed)
    await prisma.gym.updateMany({
      where: { status: "PENDING" },
      data: { status: "ACTIVE" },
    });

    const { search, sort } = req.query;

    const where: any = { status: "ACTIVE" };
    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const gyms = await prisma.gym.findMany({
      where,
      include: {
        _count: { select: { gymMemberships: true } },
        membershipPlans: { where: { isActive: true }, take: 1, orderBy: { price: "asc" } },
        owner: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = gyms.map((gym) => ({
      id: gym.id,
      name: gym.name,
      location: gym.address,
      description: gym.description,
      hours: gym.schedule,
      website: gym.website,
      members: gym._count.gymMemberships,
      pricePerMonth: gym.membershipPlans[0]?.price ?? null,
      hasActivePlans: gym.membershipPlans.length > 0,
      image: gym.coverImageUrl,
      status: gym.status,
      ownerName: gym.owner.fullName,
      ownerEmail: gym.owner.email,
      cashlessEnabled: isGymCashlessEnabled(gym),
    }));

    sendSuccess(res, result);
  } catch (error) {
    console.error("List gyms error:", error);
    sendError(res, "Failed to fetch gyms", 500);
  }
}

// GET /api/gyms/:id — public detail (ACTIVE only)
export async function getGym(req: Request, res: Response): Promise<void> {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: req.params.id as string },
      include: {
        owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        membershipPlans: { where: { isActive: true }, orderBy: { price: "asc" } },
        coaches: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
        equipment: true,
        // Exercises are member-only — served via GET /api/user/exercises
        shopProducts: true,
        _count: { select: { gymMemberships: true } },
      },
    });

    if (!gym) {
      sendError(res, "Gym not found", 404);
      return;
    }

    // Pending / declined gyms are not publicly browsable or joinable.
    if (gym.status !== "ACTIVE") {
      sendError(res, "Gym not found", 404);
      return;
    }

    sendSuccess(res, toPublicGym(gym));
  } catch (error) {
    console.error("Get gym error:", error);
    sendError(res, "Failed to fetch gym", 500);
  }
}

// POST /api/gyms — create gym (owner)
export async function createGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name, address, contactNumber, description, websiteOrSlug,
      coverImageUrl, schedule, pricePerMonth, subscriptionId,
    } = req.body;

    // Never attach a "new" gym to leftover data — owner must delete first
    const existingGym = await prisma.gym.findFirst({
      where: { ownerId: req.userId! },
      select: { id: true, name: true },
    });
    if (existingGym) {
      sendError(
        res,
        "You already have a gym. Delete it before creating a new one.",
        409,
      );
      return;
    }

    const gym = await prisma.gym.create({
      data: {
        name,
        address,
        contactNumber: contactNumber || "",
        description: description || "",
        website: websiteOrSlug || "",
        coverImageUrl: coverImageUrl || "",
        schedule: schedule || "Mon-Sun: 6AM - 10PM",
        pricePerMonth: pricePerMonth || 0,
        // Auto-publish after Owner plan purchase — no admin approval
        status: "ACTIVE",
        ownerId: req.userId!,
      },
    });

    // Ensure paid plans exist in DB, then link the owner's plan to this gym
    await syncLatestOwnerSubscriptions();
    await linkOwnerSubscriptionToGym(req.userId!, gym.id, subscriptionId || null);
    void emitAdminGymsUpdated();

    // Ensure the account is OWNER in PostgreSQL (covers USER → first gym, and OWNER signup)
    const owner = await prisma.user.update({
      where: { id: req.userId! },
      data: { role: "OWNER" },
    });

    // Create admin activity
    await prisma.adminActivity.create({
      data: {
        message: `${gym.name} published`,
        tone: "SUCCESS",
      },
    });

    // Issue fresh tokens so JWT role matches OWNER immediately
    const tokenPayload = { userId: owner.id, role: owner.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: owner.id },
      data: { refreshToken },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendCreated(
      res,
      {
        ...toPublicGym(gym),
        accessToken,
        user: {
          id: owner.id,
          fullName: owner.fullName,
          email: owner.email,
          role: owner.role,
          avatarUrl: owner.avatarUrl,
        },
      },
      "Gym published successfully",
    );
  } catch (error) {
    console.error("Create gym error:", error);
    sendError(res, "Failed to create gym", 500);
  }
}

// PUT /api/gyms/:id
export async function updateGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await prisma.gym.findUnique({ where: { id: req.params.id as string } });

    if (!gym) {
      sendError(res, "Gym not found", 404);
      return;
    }

    if (gym.ownerId !== req.userId && req.userRole !== "ADMIN") {
      sendError(res, "Not authorized", 403);
      return;
    }

    const body = req.body || {};
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.address === "string") data.address = body.address;
    if (typeof body.contactNumber === "string") data.contactNumber = body.contactNumber;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.schedule === "string") data.schedule = body.schedule;
    if (typeof body.coverImageUrl === "string") data.coverImageUrl = body.coverImageUrl;
    // Map frontend field names → Prisma columns
    if (typeof body.websiteOrSlug === "string") data.website = body.websiteOrSlug;
    else if (typeof body.website === "string") data.website = body.website;
    // Pricing comes only from Membership Plans — ignore legacy base price fields

    const updated = await prisma.gym.update({
      where: { id: req.params.id as string },
      data,
    });

    sendSuccess(res, updated, "Gym updated");
  } catch (error) {
    console.error("Update gym error:", error);
    sendError(res, "Failed to update gym", 500);
  }
}

// DELETE /api/gyms/:id
export async function deleteGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await prisma.gym.findUnique({ where: { id: req.params.id as string } });

    if (!gym) {
      sendError(res, "Gym not found", 404);
      return;
    }

    if (gym.ownerId !== req.userId && req.userRole !== "ADMIN") {
      sendError(res, "Not authorized", 403);
      return;
    }

    const ownerId = gym.ownerId;
    const isAdminDelete = req.userRole === "ADMIN";

    let mustRepurchase = false;
    let kickedClerkIds: string[] = [];
    let memberUserIds: string[] = [];

    // Resolve gym scope before the transaction so we can kick sessions first
    const gymsToRemove = isAdminDelete
      ? await prisma.gym.findMany({ where: { ownerId }, select: { id: true } })
      : [{ id: gym.id }];
    const gymIds = gymsToRemove.map((g) => g.id);

    const [clerks, memberships] = await Promise.all([
      prisma.user.findMany({
        where: { clerkGymId: { in: gymIds }, role: "CLERK" },
        select: { id: true },
      }),
      prisma.gymMembership.findMany({
        where: { gymId: { in: gymIds } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    kickedClerkIds = clerks.map((c) => c.id);
    memberUserIds = memberships.map((m) => m.userId);

    // Realtime logout before rows disappear
    for (const clerkId of kickedClerkIds) {
      kickUserSession(
        clerkId,
        "Your account has been removed because the gym was deleted.",
      );
    }

    await prisma.$transaction(async (tx) => {
      // Detach then permanently remove clerks (no orphan CLERK accounts)
      await tx.user.updateMany({
        where: { clerkGymId: { in: gymIds }, role: "CLERK" },
        data: { clerkGymId: null, refreshToken: null },
      });

      for (const clerkId of kickedClerkIds) {
        const stillThere = await tx.user.findUnique({
          where: { id: clerkId },
          select: { id: true },
        });
        if (stillThere) {
          await purgeUserRecords(tx, clerkId);
        }
      }

      // Explicit gym-scoped cleanup (cascade also covers children)
      await tx.walkInApproval.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.gymMembership.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.clerkTransaction.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.dailySalesReport.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.message.deleteMany({
        where: { conversation: { gymId: { in: gymIds } } },
      });
      await tx.conversation.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.membershipPlan.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.coach.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.equipment.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.exercise.deleteMany({ where: { gymId: { in: gymIds } } });
      await tx.shopProduct.deleteMany({ where: { gymId: { in: gymIds } } });

      await tx.gym.deleteMany({ where: { id: { in: gymIds } } });

      const remaining = await tx.gym.count({ where: { ownerId } });
      if (remaining === 0) {
        // Expire plan access (keep rows for revenue history) + demote to USER
        await tx.ownerSubscription.updateMany({
          where: { ownerId },
          data: { gymId: null, validUntil: new Date() },
        });
        await tx.user.update({
          where: { id: ownerId },
          data: { role: "USER" },
        });
        mustRepurchase = true;
      }
    });

    for (const userId of memberUserIds) {
      emitMembershipUpdated(userId);
    }

    // Owner UI must drop every cached clerk/plan/coach/etc. immediately
    emitToUser(ownerId, "owner_gym_cleared", {
      gymIds,
      removedClerks: kickedClerkIds.length,
    });

    if (mustRepurchase) {
      emitToUser(ownerId, "owner_must_repurchase", {
        reason: isAdminDelete ? "admin_deleted_gym" : "owner_deleted_gym",
      });
    }
    void emitAdminUsersUpdated();
    void emitAdminGymsUpdated();

    sendSuccess(res, { mustRepurchase, removedClerks: kickedClerkIds.length }, "Gym deleted");
  } catch (error) {
    console.error("Delete gym error:", error);
    sendError(res, "Failed to delete gym", 500);
  }
}
