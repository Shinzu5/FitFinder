import type { Gym, User } from "@prisma/client";
import { AdminRepository } from "@/repositories/admin.repository";
import { GymRepository } from "@/repositories/gym.repository";
import { UserRepository } from "@/repositories/user.repository";
import {
  LinkOwnerSubscriptionToGymService as linkOwnerSubscriptionToGym,
  SyncLatestOwnerSubscriptionsService as syncLatestOwnerSubscriptions,
} from "@/services/subscription";
import { EmitAdminGymsUpdatedService as emitAdminGymsUpdated } from "@/services/realtime/emit-admin-gyms-updated-service";
import { generateAccessToken, generateRefreshToken } from "@/utils/jwt";

const adminRepository = new AdminRepository();
const gymRepository = new GymRepository();
const userRepository = new UserRepository();

/**
 * Create an owner's gym (POST /api/gyms): refuse when the owner already has
 * one, publish the gym, sync + link the owner's paid plan, promote the account
 * to OWNER and mint fresh OWNER tokens. Moved out of gym.controller.
 */
export async function CreateGymService(args: {
  ownerId: string;
  name: string;
  address: string;
  contactNumber?: string;
  description?: string;
  websiteOrSlug?: string;
  coverImageUrl?: string;
  schedule?: string;
  pricePerMonth?: number;
  subscriptionId?: string;
}): Promise<
  | { kind: "exists" }
  | { kind: "created"; gym: Gym; owner: User; accessToken: string; refreshToken: string }
> {
  const {
    ownerId,
    name,
    address,
    contactNumber,
    description,
    websiteOrSlug,
    coverImageUrl,
    schedule,
    pricePerMonth,
    subscriptionId,
  } = args;

  // Never attach a "new" gym to leftover data — owner must delete first
  const existingGym = await gymRepository.findFirst({
    where: { ownerId },
    select: { id: true, name: true },
  });
  if (existingGym) {
    return { kind: "exists" };
  }

  const gym = await gymRepository.createGym({
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
    ownerId,
  });

  // Ensure paid plans exist in DB, then link the owner's plan to this gym
  await syncLatestOwnerSubscriptions();
  await linkOwnerSubscriptionToGym(ownerId, gym.id, subscriptionId || null);
  void emitAdminGymsUpdated();

  // Ensure the account is OWNER in PostgreSQL (covers USER → first gym, and OWNER signup)
  const owner = await userRepository.updateById(ownerId, { role: "OWNER" });

  // Create admin activity
  await adminRepository.createActivity({
    data: {
      message: `${gym.name} published`,
      tone: "SUCCESS",
    },
  });

  // Issue fresh tokens so JWT role matches OWNER immediately
  const tokenPayload = { userId: owner.id, role: owner.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await userRepository.setRefreshToken(owner.id, refreshToken);

  return { kind: "created", gym, owner, accessToken, refreshToken };
}
