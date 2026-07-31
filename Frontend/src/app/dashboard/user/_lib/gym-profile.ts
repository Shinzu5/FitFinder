import type { GymCoach } from "@/stores/owner-coaches-store";
import type { GymEquipment } from "@/stores/owner-equipment-store";
import type { MembershipPlan } from "@/stores/owner-membership-plans-store";
import { resolveMediaUrl } from "@/lib/media";

export interface PublicGymOwner {
  name: string;
  bio: string;
  avatarUrl: string;
}

export interface PublicGymPlan {
  id: string;
  name: string;
  price: number;
  periodLabel: string;
  durationLabel: string;
  features: string[];
  popular?: boolean;
}

export interface PublicGymCoach {
  id: string;
  name: string;
  specialty: string;
  sessionPrice: number;
  photoUrl: string | null;
  description: string;
  schedule: Record<string, string>;
}

export interface PublicGymProfile {
  id: string;
  name: string;
  location: string;
  description: string;
  hours: string;
  openTime: string;
  closeTime: string;
  website: string;
  phone: string;
  socialHandle: string;
  members: number;
  rating: number;
  reviewCount: number;
  image: string;
  owner: PublicGymOwner;
  plans: PublicGymPlan[];
  coaches: PublicGymCoach[];
  equipment: string[];
  /** True when gym has valid Xendit key + toggle on; omit/false = walk-in only */
  cashlessEnabled?: boolean;
}

function formatWebsite(slug: string) {
  return slug.replace(/^https?:\/\//i, "").replace(/^@/, "") || "";
}

function parseScheduleHours(schedule: string) {
  const match = schedule.match(
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i,
  );
  if (!match) {
    return { openTime: "", closeTime: "" };
  }
  return { openTime: match[1].toUpperCase(), closeTime: match[2].toUpperCase() };
}

function getPeriodLabel(durationDays: number) {
  if (durationDays <= 31) return "/mo";
  if (durationDays <= 92) return "/3mo";
  return "/yr";
}

function getDurationLabel(durationDays: number) {
  return `${durationDays} days access`;
}

function mapDbPlans(
  plans: Array<{ id: string; name: string; price: number; durationDays: number }>,
): PublicGymPlan[] {
  const sorted = [...plans].sort((a, b) => a.durationDays - b.durationDays);
  const popularIndex = sorted.findIndex((plan) => plan.durationDays === 90);
  const popularId = popularIndex >= 0 ? sorted[popularIndex]?.id : sorted[1]?.id;

  return sorted.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    periodLabel: getPeriodLabel(plan.durationDays),
    durationLabel: getDurationLabel(plan.durationDays),
    features: [],
    popular: plan.id === popularId,
  }));
}

function mapDbCoaches(coaches: GymCoach[]): PublicGymCoach[] {
  return coaches.map((coach) => ({
    id: coach.id,
    name: coach.name,
    specialty: coach.specialty,
    sessionPrice: coach.sessionPrice,
    photoUrl: coach.photoUrl,
    description: coach.description || "",
    schedule: (coach.schedule as Record<string, string>) || {},
  }));
}

function mapDbEquipment(equipment: GymEquipment[]): string[] {
  return equipment
    .filter((item) => String(item.status || "").toLowerCase() === "available")
    .map((item) => `${item.name} (x${item.quantity})`);
}

export interface ResolveGymProfileInput {
  gymId: string;
  realGym?: any | null;
  ownerName?: string;
  ownerAvatarUrl?: string;
  ownerPlans?: MembershipPlan[];
  ownerCoaches?: GymCoach[];
  ownerEquipment?: GymEquipment[];
}

/** Build a public profile strictly from Neon gym payload (active plans only). */
export function resolveGymProfile(input: ResolveGymProfileInput): PublicGymProfile | null {
  const { gymId, realGym, ownerName = "Gym Owner", ownerAvatarUrl } = input;

  if (!realGym || realGym.id !== gymId) {
    return null;
  }

  const { openTime, closeTime } = parseScheduleHours(realGym.schedule || "");
  const website = formatWebsite(realGym.website || "");
  const memberCount = realGym._count?.gymMemberships || 0;

  return {
    id: realGym.id,
    name: realGym.name,
    location: realGym.address || realGym.location || "",
    description: realGym.description || "",
    hours: realGym.schedule || realGym.hours || "",
    openTime,
    closeTime,
    website,
    phone: realGym.contactNumber || "",
    socialHandle: website ? `@${website.split(".")[0]}` : "",
    members: memberCount,
    rating: 0,
    reviewCount: memberCount,
    image: resolveMediaUrl(realGym.coverImageUrl || realGym.image),
    owner: {
      name: realGym.owner?.fullName || ownerName,
      bio: `Owner of ${realGym.name}.`,
      avatarUrl: resolveMediaUrl(
        realGym.owner?.avatarUrl || ownerAvatarUrl || "",
      ),
    },
    // Never invent plans — empty array when Owner deleted all active plans
    plans: mapDbPlans(realGym.membershipPlans || []),
    coaches: mapDbCoaches(realGym.coaches || []),
    equipment: mapDbEquipment(realGym.equipment || []),
    cashlessEnabled: Boolean(realGym.cashlessEnabled),
  };
}

export function getWebsiteHref(website: string) {
  const clean = formatWebsite(website);
  if (!clean) return "#";
  return clean.startsWith("http") ? clean : `https://${clean}`;
}
