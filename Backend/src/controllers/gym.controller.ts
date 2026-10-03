import { Request, Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import { setAuthCookies } from "@/utils/cookies";
import {
  CreateGymService,
  DeleteGymService,
  GetPublicGymService,
  ListPublicGymsService,
  UpdateGymService,
} from "@/services/gym";

function isValidXenditKey(key: string): boolean {
  return key.startsWith("xnd_production_") || key.startsWith("xnd_development_");
}

export class GymController {
  /** Cashless only when owner saved a valid key and left the toggle on. Never leak the key. */
  public isGymCashlessEnabled = (gym: any): boolean => {
    const key = String(gym?.xenditApiKey || "").trim();
    const enabled = Boolean(gym?.xenditEnabled);
    return Boolean(enabled && isValidXenditKey(key));
  };

  private toPublicGym = (gym: any) => {
    const { xenditApiKey: _omitKey, xenditEnabled: _omitEnabled, ...rest } = gym;
    return {
      ...rest,
      cashlessEnabled: this.isGymCashlessEnabled(gym),
    };
  };

  // GET /api/gyms — list active gyms (public)
  public listGyms = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search } = req.query;

      const { gyms, activeNowByGym } = await ListPublicGymsService(search);

      const result = gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        location: gym.address,
        description: gym.description,
        hours: gym.schedule,
        website: gym.website,
        members: gym._count.gymMemberships,
        activeNow: activeNowByGym.get(gym.id) ?? 0,
        pricePerMonth: gym.membershipPlans[0]?.price ?? null,
        hasActivePlans: gym.membershipPlans.length > 0,
        image: gym.coverImageUrl,
        status: gym.status,
        ownerName: gym.owner.fullName,
        ownerEmail: gym.owner.email,
        cashlessEnabled: this.isGymCashlessEnabled(gym),
      }));

      sendSuccess(res, result);
    } catch (error) {
      console.error("List gyms error:", error);
      sendError(res, "Failed to fetch gyms", 500);
    }
  };

  // GET /api/gyms/:id — public detail (ACTIVE only)
  public getGym = async (req: Request, res: Response): Promise<void> => {
    try {
      const gym = await GetPublicGymService(String(req.params.id));

      // Pending / declined gyms are not publicly browsable or joinable.
      if (!gym || gym.status !== "ACTIVE") {
        sendError(res, "Gym not found", 404);
        return;
      }

      sendSuccess(res, this.toPublicGym(gym));
    } catch (error) {
      console.error("Get gym error:", error);
      sendError(res, "Failed to fetch gym", 500);
    }
  };

  // POST /api/gyms — create gym (owner)
  public createGym = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name, address, contactNumber, description, websiteOrSlug,
        coverImageUrl, schedule, pricePerMonth, subscriptionId,
      } = req.body;

      const result = await CreateGymService({
        ownerId: req.userId!,
        name,
        address,
        contactNumber,
        description,
        websiteOrSlug,
        coverImageUrl,
        schedule,
        pricePerMonth,
        subscriptionId,
      });

      if (result.kind === "exists") {
        sendError(
          res,
          "You already have a gym. Delete it before creating a new one.",
          409,
        );
        return;
      }

      const { gym, owner, accessToken, refreshToken } = result;

      setAuthCookies(res, { accessToken, refreshToken });

      sendCreated(
        res,
        {
          ...this.toPublicGym(gym),
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
  };

  // PUT /api/gyms/:id
  public updateGym = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
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

      const result = await UpdateGymService({
        gymId: String(req.params.id),
        actorId: req.userId!,
        actorRole: req.userRole,
        data,
      });

      if (result.kind === "not-found") {
        sendError(res, "Gym not found", 404);
        return;
      }

      if (result.kind === "forbidden") {
        sendError(res, "Not authorized", 403);
        return;
      }

      sendSuccess(res, result.gym, "Gym updated");
    } catch (error) {
      console.error("Update gym error:", error);
      sendError(res, "Failed to update gym", 500);
    }
  };

  // DELETE /api/gyms/:id
  public deleteGym = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await DeleteGymService({
        gymId: String(req.params.id),
        actorId: req.userId!,
        actorRole: req.userRole,
      });

      if (result.kind === "not-found") {
        sendError(res, "Gym not found", 404);
        return;
      }

      if (result.kind === "forbidden") {
        sendError(res, "Not authorized", 403);
        return;
      }

      sendSuccess(
        res,
        { mustRepurchase: result.mustRepurchase, removedClerks: result.removedClerks },
        "Gym deleted",
      );
    } catch (error) {
      console.error("Delete gym error:", error);
      sendError(res, "Failed to delete gym", 500);
    }
  };
}

export default new GymController();
