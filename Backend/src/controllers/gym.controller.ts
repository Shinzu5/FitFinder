import { Request, Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";

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
        membershipPlans: { take: 1, orderBy: { price: "asc" } },
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
      pricePerMonth: gym.membershipPlans[0]?.price ?? gym.pricePerMonth,
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
        membershipPlans: { orderBy: { price: "asc" } },
        coaches: true,
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

    // Link subscription to gym if provided
    if (subscriptionId) {
      await prisma.ownerSubscription.update({
        where: { id: subscriptionId },
        data: { gymId: gym.id },
      });
    }

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
    if (typeof body.membershipPrice === "number") data.pricePerMonth = body.membershipPrice;
    else if (typeof body.pricePerMonth === "number") data.pricePerMonth = body.pricePerMonth;

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

    await prisma.$transaction(async (tx) => {
      // Which gyms will be removed?
      // Admin delete: remove ALL gyms for this owner (app is 1-owner → onboarding again).
      // Owner self-delete: remove only this gym.
      const gymsToRemove = isAdminDelete
        ? await tx.gym.findMany({ where: { ownerId }, select: { id: true } })
        : [{ id: gym.id }];
      const gymIds = gymsToRemove.map((g) => g.id);

      // Unassign + demote clerks tied to any of these gyms
      await tx.user.updateMany({
        where: { clerkGymId: { in: gymIds } },
        data: { clerkGymId: null, role: "USER" },
      });

      // Wipe owner platform subscriptions so they must pay again on onboarding
      await tx.ownerSubscription.deleteMany({ where: { ownerId } });

      // Delete gyms (children cascade via Prisma schema)
      await tx.gym.deleteMany({ where: { id: { in: gymIds } } });

      const remaining = await tx.gym.count({ where: { ownerId } });
      if (remaining === 0) {
        await tx.user.update({
          where: { id: ownerId },
          data: { role: "USER" },
        });
      }
    });

    sendSuccess(res, null, "Gym deleted");
  } catch (error) {
    console.error("Delete gym error:", error);
    sendError(res, "Failed to delete gym", 500);
  }
}
