import { Response } from "express";
import prisma, { withDbRetry } from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { hashPassword } from "../utils/hash";
import {
  emitAdminUsersUpdated,
  emitCoachesUpdated,
  emitEquipmentUpdated,
  emitMembersUpdated,
  emitMembershipPlansUpdated,
  emitShopUpdated,
  emitWalkInApprovalsUpdated,
  emitWalkInStatus,
} from "../services/realtime.service";
import { permanentlyDeleteUser } from "../services/accountRemoval.service";

// Helper: get the owner's gym
async function getOwnerGym(ownerId: string) {
  return prisma.gym.findFirst({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

// GET /api/owner/my-gym
// ?light=1 — tiny payload for ownership checks (avoids lag / pool pressure)
export async function getMyGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const light =
      req.query.light === "1" ||
      req.query.light === "true" ||
      String(req.query.fields || "") === "status";

    if (light) {
      const gym = await withDbRetry(() =>
        prisma.gym.findFirst({
          where: { ownerId: req.userId! },
          select: { id: true, name: true, status: true },
          orderBy: { createdAt: "desc" },
        }),
      );
      sendSuccess(res, gym);
      return;
    }

    const gym = await withDbRetry(() =>
      prisma.gym.findFirst({
        where: { ownerId: req.userId! },
        include: {
          _count: { select: { gymMemberships: true, coaches: true, equipment: true } },
          membershipPlans: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    );

    if (!gym) {
      sendSuccess(res, null, "No gym registered");
      return;
    }

    const { xenditApiKey: _key, ...safeGym } = gym;
    sendSuccess(res, {
      ...safeGym,
      cashlessEnabled:
        Boolean(gym.xenditEnabled) &&
        Boolean(
          (gym.xenditApiKey || "").startsWith("xnd_production_") ||
            (gym.xenditApiKey || "").startsWith("xnd_development_"),
        ),
      hasXenditApiKey: Boolean((gym.xenditApiKey || "").trim()),
      memberCount: gym._count.gymMemberships,
    });
  } catch (error) {
    console.error("Get my gym error:", error);
    sendError(res, "Failed to fetch gym", 500);
  }
}

// ─── Members ──────────────────────────────────────────────────────────────────

// GET /api/owner/members
export async function getMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const { listGymMembers } = await import("../services/gymMembership.service");
    const members = await listGymMembers(gym.id);
    sendSuccess(res, members);
  } catch (error) {
    console.error("Get members error:", error);
    sendError(res, "Failed to fetch members", 500);
  }
}

// DELETE /api/owner/members/:id
export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const membership = await prisma.gymMembership.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
      select: { id: true, userId: true, gymId: true },
    });
    if (!membership) { sendError(res, "Member not found", 404); return; }

    await prisma.gymMembership.delete({ where: { id: membership.id } });

    const { notifyMembershipChange } = await import("../services/gymMembership.service");
    await notifyMembershipChange(membership.userId, membership.gymId);

    sendSuccess(res, null, "Member removed");
  } catch (error) {
    console.error("Remove member error:", error);
    sendError(res, "Failed to remove member", 500);
  }
}

// ─── Membership Plans ─────────────────────────────────────────────────────────

// GET /api/owner/membership-plans
export async function getMembershipPlans(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const plans = await prisma.membershipPlan.findMany({
      where: { gymId: gym.id, isActive: true },
      include: { _count: { select: { gymMemberships: true } } },
    });

    const result = plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      durationDays: p.durationDays,
      activeSubscribers: p._count.gymMemberships,
    }));

    sendSuccess(res, result);
  } catch (error) {
    console.error("Get plans error:", error);
    sendError(res, "Failed to fetch plans", 500);
  }
}

// POST /api/owner/membership-plans
export async function createMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const plan = await prisma.membershipPlan.create({
      data: {
        gymId: gym.id,
        name: req.body.name,
        price: req.body.price,
        durationDays: req.body.durationDays,
      },
    });

    void emitMembershipPlansUpdated(gym.id);
    sendCreated(res, plan, "Plan created");
  } catch (error) {
    console.error("Create plan error:", error);
    sendError(res, "Failed to create plan", 500);
  }
}

// PUT /api/owner/membership-plans/:id
export async function updateMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.membershipPlan.findFirst({
      where: { id: req.params.id as string, gymId: gym.id, isActive: true },
    });
    if (!existing) { sendError(res, "Plan not found", 404); return; }

    const plan = await prisma.membershipPlan.update({
      where: { id: existing.id },
      data: {
        name: req.body.name,
        price: req.body.price,
        durationDays: req.body.durationDays,
      },
    });

    void emitMembershipPlansUpdated(gym.id);
    sendSuccess(res, plan, "Plan updated");
  } catch (error) {
    console.error("Update plan error:", error);
    sendError(res, "Failed to update plan", 500);
  }
}

// DELETE /api/owner/membership-plans/:id
// Soft-delete: hide from new purchases; existing paid members keep access until expiresAt.
export async function deleteMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.membershipPlan.findFirst({
      where: { id: req.params.id as string, gymId: gym.id, isActive: true },
    });
    if (!existing) { sendError(res, "Plan not found", 404); return; }

    const declinedPending = await prisma.$transaction(async (tx) => {
      // Ensure every linked membership has a plan snapshot before hiding the plan
      const members = await tx.gymMembership.findMany({
        where: { planId: existing.id },
        select: { id: true, planName: true, durationDays: true },
      });
      for (const m of members) {
        if (!m.planName || !m.durationDays) {
          await tx.gymMembership.update({
            where: { id: m.id },
            data: {
              planName: existing.name,
              planPrice: existing.price,
              durationDays: existing.durationDays,
            },
          });
        }
      }

      await tx.walkInApproval.updateMany({
        where: { planId: existing.id, planName: "" },
        data: {
          planName: existing.name,
          planPrice: existing.price,
        },
      });

      const pending = await tx.walkInApproval.findMany({
        where: { planId: existing.id, status: "PENDING" },
        include: { gym: { select: { name: true } } },
      });

      // Pending walk-ins for this plan can no longer proceed
      if (pending.length > 0) {
        await tx.walkInApproval.updateMany({
          where: { id: { in: pending.map((p) => p.id) } },
          data: {
            status: "DECLINED",
            rejectionReason: "Membership plan was removed by the gym owner.",
            reviewedAt: new Date(),
            planName: existing.name,
            planPrice: existing.price,
          },
        });
      }

      await tx.membershipPlan.update({
        where: { id: existing.id },
        data: { isActive: false },
      });

      return pending;
    });

    for (const p of declinedPending) {
      emitWalkInStatus(p.userId, {
        id: p.id,
        userId: p.userId,
        memberName: p.memberName,
        memberEmail: p.memberEmail,
        gymId: p.gymId,
        gymName: p.gym.name,
        planId: p.planId,
        planName: existing.name,
        planPrice: existing.price,
        coachId: p.coachId,
        coachName: p.coachName,
        coachSessionPrice: p.coachSessionPrice,
        paymentRef: p.paymentRef,
        totalPaid: p.totalPaid,
        durationDays: p.durationDays,
        paymentStatus: String(p.paymentStatus || "PAID").toLowerCase(),
        approvalStatus: "declined",
        status: "declined",
        rejectionReason: "Membership plan was removed by the gym owner.",
        submittedAt: p.submittedAt.getTime(),
        reviewedAt: Date.now(),
        consumedAt: p.consumedAt?.getTime() ?? null,
      });
    }
    if (declinedPending.length > 0) {
      void emitWalkInApprovalsUpdated(gym.id);
    }

    void emitMembershipPlansUpdated(gym.id);
    sendSuccess(res, null, "Plan deleted");
  } catch (error) {
    console.error("Delete plan error:", error);
    sendError(res, "Failed to delete plan", 500);
  }
}

// ─── Coaches ──────────────────────────────────────────────────────────────────

// GET /api/owner/coaches
export async function getCoaches(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const coaches = await prisma.coach.findMany({
      where: { gymId: gym.id },
      orderBy: { createdAt: "asc" },
    });
    sendSuccess(res, coaches);
  } catch (error) {
    console.error("Get coaches error:", error);
    sendError(res, "Failed to fetch coaches", 500);
  }
}

// POST /api/owner/coaches
export async function createCoach(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const coach = await prisma.coach.create({
      data: {
        gymId: gym.id,
        name: req.body.name,
        specialty: req.body.specialty,
        sessionPrice: req.body.sessionPrice,
        description: req.body.description || "",
        photoUrl: req.body.photoUrl || null,
        photoName: req.body.photoName || null,
        schedule: req.body.schedule || {},
        isActive: req.body.isActive === false ? false : true,
      },
    });

    void emitCoachesUpdated(gym.id);
    sendCreated(res, coach, "Coach added");
  } catch (error) {
    console.error("Create coach error:", error);
    sendError(res, "Failed to add coach", 500);
  }
}

// PUT /api/owner/coaches/:id
export async function updateCoach(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.coach.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Coach not found", 404); return; }

    const coach = await prisma.coach.update({
      where: { id: existing.id },
      data: {
        name: req.body.name ?? existing.name,
        specialty: req.body.specialty ?? existing.specialty,
        sessionPrice:
          req.body.sessionPrice !== undefined
            ? Number(req.body.sessionPrice)
            : existing.sessionPrice,
        description:
          req.body.description !== undefined
            ? String(req.body.description)
            : existing.description,
        photoUrl:
          req.body.photoUrl !== undefined ? req.body.photoUrl : existing.photoUrl,
        photoName:
          req.body.photoName !== undefined ? req.body.photoName : existing.photoName,
        schedule: req.body.schedule ?? existing.schedule,
        isActive:
          typeof req.body.isActive === "boolean" ? req.body.isActive : existing.isActive,
      },
    });

    void emitCoachesUpdated(gym.id);
    sendSuccess(res, coach, "Coach updated");
  } catch (error) {
    console.error("Update coach error:", error);
    sendError(res, "Failed to update coach", 500);
  }
}

// DELETE /api/owner/coaches/:id
export async function removeCoach(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.coach.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Coach not found", 404); return; }

    await prisma.coach.delete({ where: { id: existing.id } });
    void emitCoachesUpdated(gym.id);
    sendSuccess(res, null, "Coach removed");
  } catch (error) {
    console.error("Remove coach error:", error);
    sendError(res, "Failed to remove coach", 500);
  }
}

// ─── Equipment ────────────────────────────────────────────────────────────────

// GET /api/owner/equipment
export async function getEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const equipment = await prisma.equipment.findMany({ where: { gymId: gym.id } });
    sendSuccess(res, equipment);
  } catch (error) {
    console.error("Get equipment error:", error);
    sendError(res, "Failed to fetch equipment", 500);
  }
}

// POST /api/owner/equipment
export async function createEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const rawStatus = String(req.body.status || "AVAILABLE").toUpperCase().replace(/[\s-]+/g, "_");
    const allowed = ["AVAILABLE", "IN_USE", "UNDER_MAINTENANCE"] as const;
    const status = (allowed as readonly string[]).includes(rawStatus)
      ? (rawStatus as (typeof allowed)[number])
      : "AVAILABLE";

    const item = await prisma.equipment.create({
      data: {
        gymId: gym.id,
        name: req.body.name,
        quantity: req.body.quantity,
        status,
        imageUrl: typeof req.body.imageUrl === "string" ? req.body.imageUrl : "",
        imageName: req.body.imageName ?? null,
      },
    });

    void emitEquipmentUpdated(gym.id);
    sendCreated(res, item, "Equipment added");
  } catch (error) {
    console.error("Create equipment error:", error);
    sendError(res, "Failed to add equipment", 500);
  }
}

// PUT /api/owner/equipment/:id — update name/quantity/status
export async function updateEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.equipment.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Equipment not found", 404); return; }

    const data: Record<string, unknown> = {};
    if (typeof req.body.name === "string") data.name = req.body.name;
    if (typeof req.body.quantity === "number") data.quantity = req.body.quantity;
    if (typeof req.body.status === "string") {
      const rawStatus = req.body.status.toUpperCase().replace(/[\s-]+/g, "_");
      const allowed = ["AVAILABLE", "IN_USE", "UNDER_MAINTENANCE"];
      if (allowed.includes(rawStatus)) data.status = rawStatus;
    }
    if (typeof req.body.imageUrl === "string") data.imageUrl = req.body.imageUrl;
    if (req.body.imageName !== undefined) data.imageName = req.body.imageName;

    const updated = await prisma.equipment.update({
      where: { id: existing.id },
      data,
    });

    void emitEquipmentUpdated(gym.id);
    sendSuccess(res, updated, "Equipment updated");
  } catch (error) {
    console.error("Update equipment error:", error);
    sendError(res, "Failed to update equipment", 500);
  }
}

// PUT /api/owner/equipment/:id/toggle — cycle Available → In Use → Under Maintenance
export async function toggleEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const item = await prisma.equipment.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!item) { sendError(res, "Equipment not found", 404); return; }

    const nextStatus =
      item.status === "AVAILABLE"
        ? "IN_USE"
        : item.status === "IN_USE"
          ? "UNDER_MAINTENANCE"
          : "AVAILABLE";

    const updated = await prisma.equipment.update({
      where: { id: item.id },
      data: { status: nextStatus },
    });

    void emitEquipmentUpdated(gym.id);
    sendSuccess(res, updated, "Equipment status updated");
  } catch (error) {
    console.error("Toggle equipment error:", error);
    sendError(res, "Failed to toggle equipment", 500);
  }
}

// DELETE /api/owner/equipment/:id
export async function removeEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.equipment.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Equipment not found", 404); return; }

    await prisma.equipment.delete({ where: { id: existing.id } });
    void emitEquipmentUpdated(gym.id);
    sendSuccess(res, null, "Equipment removed");
  } catch (error) {
    console.error("Remove equipment error:", error);
    sendError(res, "Failed to remove equipment", 500);
  }
}

// ─── Exercises ────────────────────────────────────────────────────────────────

// GET /api/owner/exercises
export async function getExercises(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const exercises = await prisma.exercise.findMany({ where: { gymId: gym.id } });
    sendSuccess(res, exercises);
  } catch (error) {
    console.error("Get exercises error:", error);
    sendError(res, "Failed to fetch exercises", 500);
  }
}

// POST /api/owner/exercises
export async function createExercise(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const exercise = await prisma.exercise.create({
      data: {
        gymId: gym.id,
        name: req.body.name,
        muscle: req.body.muscle,
        category: req.body.category || req.body.muscle || "",
        difficulty: req.body.difficulty || "Beginner",
        sets: req.body.sets || "3",
        reps: req.body.reps || "8-12",
        rest: req.body.rest || "60s",
        targetMuscles: req.body.targetMuscles || req.body.muscle || "",
        formTips: req.body.formTips || "",
        mediaUrl: req.body.mediaUrl || null,
        mediaType: req.body.mediaType || null,
        mediaName: req.body.mediaName || null,
        cardImageUrl: req.body.cardImageUrl || "",
      },
    });

    sendCreated(res, exercise, "Exercise added");
  } catch (error) {
    console.error("Create exercise error:", error);
    sendError(res, "Failed to add exercise", 500);
  }
}

// PUT /api/owner/exercises/:id
export async function updateExercise(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.exercise.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Exercise not found", 404); return; }

    const exercise = await prisma.exercise.update({
      where: { id: existing.id },
      data: {
        name: req.body.name ?? existing.name,
        muscle: req.body.muscle ?? existing.muscle,
        category: req.body.category ?? req.body.muscle ?? existing.category,
        difficulty: req.body.difficulty ?? existing.difficulty,
        sets: req.body.sets ?? existing.sets,
        reps: req.body.reps ?? existing.reps,
        rest: req.body.rest ?? existing.rest,
        targetMuscles: req.body.targetMuscles ?? req.body.muscle ?? existing.targetMuscles,
        formTips: req.body.formTips ?? existing.formTips,
        mediaUrl: req.body.mediaUrl !== undefined ? req.body.mediaUrl : existing.mediaUrl,
        mediaType: req.body.mediaType !== undefined ? req.body.mediaType : existing.mediaType,
        mediaName: req.body.mediaName !== undefined ? req.body.mediaName : existing.mediaName,
        cardImageUrl: req.body.cardImageUrl ?? existing.cardImageUrl,
      },
    });

    sendSuccess(res, exercise, "Exercise updated");
  } catch (error) {
    console.error("Update exercise error:", error);
    sendError(res, "Failed to update exercise", 500);
  }
}

// DELETE /api/owner/exercises/:id
export async function removeExercise(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.exercise.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Exercise not found", 404); return; }

    await prisma.exercise.delete({ where: { id: existing.id } });
    sendSuccess(res, null, "Exercise removed");
  } catch (error) {
    console.error("Remove exercise error:", error);
    sendError(res, "Failed to remove exercise", 500);
  }
}

// ─── Shop Products ────────────────────────────────────────────────────────────

// GET /api/owner/shop
export async function getShopProducts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const products = await prisma.shopProduct.findMany({
      where: { gymId: gym.id },
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, products);
  } catch (error) {
    console.error("Get shop products error:", error);
    sendError(res, "Failed to fetch products", 500);
  }
}

// POST /api/owner/shop
export async function createShopProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const product = await prisma.shopProduct.create({
      data: {
        gymId: gym.id,
        name: req.body.name,
        price: req.body.price,
        imageUrl: req.body.imageUrl || "",
        imageName: req.body.imageName || null,
      },
    });

    void emitShopUpdated(gym.id);
    sendCreated(res, product, "Product added");
  } catch (error) {
    console.error("Create product error:", error);
    sendError(res, "Failed to add product", 500);
  }
}

// PUT /api/owner/shop/:id — update name/price/image for live Gymer sync
export async function updateShopProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.shopProduct.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Product not found", 404); return; }

    const data: Record<string, unknown> = {};
    if (typeof req.body.name === "string") data.name = req.body.name.trim();
    if (typeof req.body.price === "number") data.price = req.body.price;
    if (typeof req.body.imageUrl === "string") data.imageUrl = req.body.imageUrl;
    if (req.body.imageName !== undefined) data.imageName = req.body.imageName;

    const product = await prisma.shopProduct.update({
      where: { id: existing.id },
      data,
    });

    void emitShopUpdated(gym.id);
    sendSuccess(res, product, "Product updated");
  } catch (error) {
    console.error("Update product error:", error);
    sendError(res, "Failed to update product", 500);
  }
}

// DELETE /api/owner/shop/:id
export async function removeShopProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const existing = await prisma.shopProduct.findFirst({
      where: { id: req.params.id as string, gymId: gym.id },
    });
    if (!existing) { sendError(res, "Product not found", 404); return; }

    await prisma.shopProduct.delete({ where: { id: existing.id } });
    void emitShopUpdated(gym.id);
    sendSuccess(res, null, "Product removed");
  } catch (error) {
    console.error("Remove product error:", error);
    sendError(res, "Failed to remove product", 500);
  }
}

// ─── Staff (Clerks) ──────────────────────────────────────────────────────────

// GET /api/owner/staff
export async function getStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const clerks = await prisma.user.findMany({
      where: { clerkGymId: gym.id, role: "CLERK" },
      select: { id: true, fullName: true, email: true },
    });

    sendSuccess(res, clerks);
  } catch (error) {
    console.error("Get staff error:", error);
    sendError(res, "Failed to fetch staff", 500);
  }
}

// POST /api/owner/staff
// Creates a brand-new CLERK account with the email/password the owner enters,
// so the clerk can log in immediately with those credentials.
export async function addStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const { fullName, email, password } = req.body;

    if (!fullName?.trim() || !email?.trim() || !password) {
      sendError(res, "Full name, email, and password are required");
      return;
    }

    if (password.length < 6) {
      sendError(res, "Password must be at least 6 characters");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      sendError(res, "An account with that email already exists.", 409);
      return;
    }

    const passwordHash = await hashPassword(password);

    const clerk = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "CLERK",
        emailVerified: true, // owner-created staff accounts skip email verification
        clerkGymId: gym.id,
      },
    });

    void emitAdminUsersUpdated();
    // Reuse members_updated so Owner Overview Front Desk Staff refreshes live
    void emitMembersUpdated(gym.id);

    sendCreated(
      res,
      { id: clerk.id, fullName: clerk.fullName, email: clerk.email },
      "Clerk account created",
    );
  } catch (error) {
    console.error("Add staff error:", error);
    sendError(res, "Failed to add staff", 500);
  }
}

// DELETE /api/owner/staff/:id — permanently remove this gym's clerk + revoke session
export async function removeStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) {
      sendError(res, "No gym found", 404);
      return;
    }

    const clerkId = req.params.id as string;
    const clerk = await prisma.user.findUnique({
      where: { id: clerkId },
      select: { id: true, role: true, clerkGymId: true },
    });

    if (!clerk || clerk.role !== "CLERK" || clerk.clerkGymId !== gym.id) {
      sendError(res, "Clerk not found in your gym", 404);
      return;
    }

    const result = await permanentlyDeleteUser(clerkId, {
      message: "Your account has been removed by the Gym Owner.",
      allowRoles: ["CLERK"],
    });

    if (!result.ok) {
      sendError(res, result.message, result.status);
      return;
    }

    void emitMembersUpdated(gym.id);

    sendSuccess(res, null, "Clerk account permanently removed");
  } catch (error) {
    console.error("Remove staff error:", error);
    sendError(res, "Failed to remove staff", 500);
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

// GET /api/owner/messages
export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const conversations = await prisma.conversation.findMany({
      where: { gymId: gym.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });

    sendSuccess(res, conversations);
  } catch (error) {
    console.error("Get messages error:", error);
    sendError(res, "Failed to fetch messages", 500);
  }
}

// POST /api/owner/messages
export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { conversationId, text } = req.body;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId!,
        senderRole: "owner",
        text,
      },
    });

    sendCreated(res, message, "Message sent");
  } catch (error) {
    console.error("Send message error:", error);
    sendError(res, "Failed to send message", 500);
  }
}

function toFrontendTxnType(type: string): string {
  return type.toLowerCase().replace(/_/g, "-");
}

// GET /api/owner/sales-reports
export async function getSalesReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const dateFilter = typeof req.query.date === "string" ? req.query.date.trim() : "";

    const where: any = { gymId: gym.id };

    if (dateFilter) {
      // Expect YYYY-MM-DD
      const parts = dateFilter.split("-").map(Number);
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
        const [y, m, d] = parts;
        where.reportDate = new Date(Date.UTC(y, m - 1, d));
      }
    }

    if (search) {
      where.clerk = {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const reports = await prisma.dailySalesReport.findMany({
      where,
      include: {
        clerk: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ closedAt: "desc" }],
    });

    sendSuccess(
      res,
      reports.map((report) => {
        const closedByRole =
          String(report.closedByRole || "CLERK").toUpperCase() === "OWNER" ? "OWNER" : "CLERK";
        return {
          id: report.id,
          date: report.reportDate,
          clerkId: report.clerkId,
          clerkName: report.clerk.fullName,
          closedByRole,
          closedByLabel: closedByRole === "OWNER" ? "Closed by Owner" : "Closed by Clerk",
          referenceNo: `DSR-${report.id.slice(0, 8).toUpperCase()}`,
          totalTransactions: report.totalTransactions,
          totalRevenue: report.totalRevenue,
          closedAt: report.closedAt,
          status: "Closed",
        };
      }),
    );
  } catch (error) {
    console.error("Get sales reports error:", error);
    sendError(res, "Failed to fetch sales reports", 500);
  }
}

// GET /api/owner/sales-reports/:id
export async function getSalesReportReceipt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) { sendError(res, "No gym found", 404); return; }

    const report = await prisma.dailySalesReport.findFirst({
      where: {
        id: req.params.id as string,
        gymId: gym.id, // private to this owner's gym only
      },
      include: {
        clerk: { select: { id: true, fullName: true, email: true } },
        transactions: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!report) {
      sendError(res, "Report not found", 404);
      return;
    }

    const closedByRole =
      String(report.closedByRole || "CLERK").toUpperCase() === "OWNER" ? "OWNER" : "CLERK";

    sendSuccess(res, {
      id: report.id,
      gymId: gym.id,
      gymName: gym.name,
      gymAddress: gym.address,
      date: report.reportDate,
      clerkId: report.clerkId,
      clerkName: report.clerk.fullName,
      closedByRole,
      closedByLabel: closedByRole === "OWNER" ? "Closed by Owner" : "Closed by Clerk",
      referenceNo: `DSR-${report.id.slice(0, 8).toUpperCase()}`,
      totalTransactions: report.totalTransactions,
      totalRevenue: report.totalRevenue,
      closedAt: report.closedAt,
      status: "Closed",
      transactions: report.transactions.map((txn) => ({
        id: txn.id,
        type: toFrontendTxnType(txn.type),
        memberName: txn.memberName,
        amount: txn.amount,
        method: txn.method === "CASH" ? "Cash" : "Cashless",
        notes: txn.notes,
        createdAt: txn.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get sales report receipt error:", error);
    sendError(res, "Failed to fetch receipt", 500);
  }
}

function isValidXenditKey(key: string): boolean {
  return key.startsWith("xnd_production_") || key.startsWith("xnd_development_");
}

function maskApiKey(key: string): string {
  if (key.length <= 16) return "••••••••";
  return `${key.slice(0, 12)}${"•".repeat(Math.min(key.length - 16, 20))}${key.slice(-4)}`;
}

// GET /api/owner/payment-settings — optional Xendit (walk-in always available)
export async function getPaymentSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) {
      sendError(res, "No gym found", 404);
      return;
    }

    const key = (gym.xenditApiKey || "").trim();
    const hasApiKey = isValidXenditKey(key);

    sendSuccess(res, {
      hasApiKey,
      maskedApiKey: hasApiKey ? maskApiKey(key) : null,
      xenditEnabled: hasApiKey ? gym.xenditEnabled : false,
      cashlessEnabled: hasApiKey && gym.xenditEnabled,
      walkInAlwaysEnabled: true,
    });
  } catch (error) {
    console.error("Get payment settings error:", error);
    sendError(res, "Failed to fetch payment settings", 500);
  }
}

// PUT /api/owner/payment-settings
export async function updatePaymentSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await getOwnerGym(req.userId!);
    if (!gym) {
      sendError(res, "No gym found", 404);
      return;
    }

    const { xenditApiKey, xenditEnabled, clearApiKey } = req.body as {
      xenditApiKey?: string;
      xenditEnabled?: boolean;
      clearApiKey?: boolean;
    };

    const data: { xenditApiKey?: string; xenditEnabled?: boolean } = {};

    if (clearApiKey === true) {
      data.xenditApiKey = "";
      data.xenditEnabled = false;
    }

    if (typeof xenditApiKey === "string") {
      const trimmed = xenditApiKey.trim();
      if (!trimmed) {
        data.xenditApiKey = "";
        data.xenditEnabled = false;
      } else if (!isValidXenditKey(trimmed)) {
        sendError(res, "Key must start with xnd_production_ or xnd_development_");
        return;
      } else {
        data.xenditApiKey = trimmed;
        // Saving a valid key enables cashless unless explicitly disabled in same request
        if (typeof xenditEnabled !== "boolean") {
          data.xenditEnabled = true;
        }
      }
    }

    if (typeof xenditEnabled === "boolean") {
      const nextKey =
        data.xenditApiKey !== undefined ? data.xenditApiKey : gym.xenditApiKey;
      if (xenditEnabled && !isValidXenditKey((nextKey || "").trim())) {
        sendError(res, "Save a valid Xendit API key before enabling cashless payments");
        return;
      }
      data.xenditEnabled = xenditEnabled;
    }

    if (Object.keys(data).length === 0) {
      sendError(res, "No payment settings to update");
      return;
    }

    const updated = await prisma.gym.update({
      where: { id: gym.id },
      data,
    });

    const key = (updated.xenditApiKey || "").trim();
    const hasApiKey = isValidXenditKey(key);

    sendSuccess(
      res,
      {
        hasApiKey,
        maskedApiKey: hasApiKey ? maskApiKey(key) : null,
        xenditEnabled: hasApiKey ? updated.xenditEnabled : false,
        cashlessEnabled: hasApiKey && updated.xenditEnabled,
        walkInAlwaysEnabled: true,
      },
      "Payment settings updated",
    );
  } catch (error) {
    console.error("Update payment settings error:", error);
    sendError(res, "Failed to update payment settings", 500);
  }
}
