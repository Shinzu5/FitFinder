import { Request, Response } from "express";
import prisma from "../config/database";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { AuthRequest } from "../middleware/auth";

// GET /api/gyms — list active gyms (public)
export async function listGyms(req: Request, res: Response): Promise<void> {
  try {
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
    }));

    sendSuccess(res, result);
  } catch (error) {
    console.error("List gyms error:", error);
    sendError(res, "Failed to fetch gyms", 500);
  }
}

// GET /api/gyms/:id
export async function getGym(req: Request, res: Response): Promise<void> {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: req.params.id as string },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        membershipPlans: true,
        coaches: true,
        equipment: true,
        exercises: true,
        shopProducts: true,
        _count: { select: { gymMemberships: true } },
      },
    });

    if (!gym) {
      sendError(res, "Gym not found", 404);
      return;
    }

    sendSuccess(res, gym);
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
        status: "PENDING",
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

    // Create admin activity
    await prisma.adminActivity.create({
      data: {
        message: `New gym application: ${gym.name}`,
        tone: "WARNING",
      },
    });

    sendCreated(res, gym, "Gym registration submitted for approval");
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

    const updated = await prisma.gym.update({
      where: { id: req.params.id as string },
      data: req.body,
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

    await prisma.gym.delete({ where: { id: req.params.id as string } });

    sendSuccess(res, null, "Gym deleted");
  } catch (error) {
    console.error("Delete gym error:", error);
    sendError(res, "Failed to delete gym", 500);
  }
}
