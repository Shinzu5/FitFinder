import { Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";
import { hashPassword } from "../utils/hash";

// Helper: get the owner's gym
async function getOwnerGym(ownerId: string) {
  return prisma.gym.findFirst({ where: { ownerId } });
}

// GET /api/owner/my-gym
export async function getMyGym(req: AuthRequest, res: Response): Promise<void> {
  try {
    const gym = await prisma.gym.findFirst({
      where: { ownerId: req.userId! },
      include: {
        _count: { select: { gymMemberships: true, coaches: true, equipment: true } },
        membershipPlans: true,
      },
    });

    if (!gym) {
      sendSuccess(res, null, "No gym registered");
      return;
    }

    sendSuccess(res, {
      ...gym,
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

    const memberships = await prisma.gymMembership.findMany({
      where: { gymId: gym.id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        plan: { select: { name: true, durationDays: true } },
      },
      orderBy: { joinedAt: "desc" },
    });

    const members = memberships.map((m) => {
      const totalDays = m.plan.durationDays;
      const remainingDays = Math.max(0, Math.ceil((m.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return {
        id: m.id,
        fullName: m.user.fullName,
        email: m.user.email,
        planName: m.plan.name,
        totalDays,
        remainingDays,
        paymentStatus: m.totalPaid > 0 ? "paid" : "unpaid",
        status: remainingDays <= 5 ? "expiring" : "active",
      };
    });

    sendSuccess(res, members);
  } catch (error) {
    console.error("Get members error:", error);
    sendError(res, "Failed to fetch members", 500);
  }
}

// DELETE /api/owner/members/:id
export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.gymMembership.delete({ where: { id: req.params.id as string } });
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
      where: { gymId: gym.id },
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

    sendCreated(res, plan, "Plan created");
  } catch (error) {
    console.error("Create plan error:", error);
    sendError(res, "Failed to create plan", 500);
  }
}

// PUT /api/owner/membership-plans/:id
export async function updateMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const plan = await prisma.membershipPlan.update({
      where: { id: req.params.id as string },
      data: {
        name: req.body.name,
        price: req.body.price,
        durationDays: req.body.durationDays,
      },
    });

    sendSuccess(res, plan, "Plan updated");
  } catch (error) {
    console.error("Update plan error:", error);
    sendError(res, "Failed to update plan", 500);
  }
}

// DELETE /api/owner/membership-plans/:id
export async function deleteMembershipPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.membershipPlan.delete({ where: { id: req.params.id as string } });
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

    const coaches = await prisma.coach.findMany({ where: { gymId: gym.id } });
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
      },
    });

    sendCreated(res, coach, "Coach added");
  } catch (error) {
    console.error("Create coach error:", error);
    sendError(res, "Failed to add coach", 500);
  }
}

// DELETE /api/owner/coaches/:id
export async function removeCoach(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.coach.delete({ where: { id: req.params.id as string } });
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

    const item = await prisma.equipment.create({
      data: {
        gymId: gym.id,
        name: req.body.name,
        quantity: req.body.quantity,
        status: req.body.status || "AVAILABLE",
      },
    });

    sendCreated(res, item, "Equipment added");
  } catch (error) {
    console.error("Create equipment error:", error);
    sendError(res, "Failed to add equipment", 500);
  }
}

// PUT /api/owner/equipment/:id/toggle
export async function toggleEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const item = await prisma.equipment.findUnique({ where: { id: req.params.id as string } });
    if (!item) { sendError(res, "Equipment not found", 404); return; }

    const updated = await prisma.equipment.update({
      where: { id: req.params.id as string },
      data: { status: item.status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE" },
    });

    sendSuccess(res, updated, "Equipment status toggled");
  } catch (error) {
    console.error("Toggle equipment error:", error);
    sendError(res, "Failed to toggle equipment", 500);
  }
}

// DELETE /api/owner/equipment/:id
export async function removeEquipment(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.equipment.delete({ where: { id: req.params.id as string } });
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
        ...req.body,
      },
    });

    sendCreated(res, exercise, "Exercise added");
  } catch (error) {
    console.error("Create exercise error:", error);
    sendError(res, "Failed to add exercise", 500);
  }
}

// DELETE /api/owner/exercises/:id
export async function removeExercise(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.exercise.delete({ where: { id: req.params.id as string } });
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

    const products = await prisma.shopProduct.findMany({ where: { gymId: gym.id } });
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

    sendCreated(res, product, "Product added");
  } catch (error) {
    console.error("Create product error:", error);
    sendError(res, "Failed to add product", 500);
  }
}

// DELETE /api/owner/shop/:id
export async function removeShopProduct(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.shopProduct.delete({ where: { id: req.params.id as string } });
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

// DELETE /api/owner/staff/:id
export async function removeStaff(req: AuthRequest, res: Response): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: req.params.id as string },
      data: { clerkGymId: null },
    });
    sendSuccess(res, null, "Staff removed");
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
