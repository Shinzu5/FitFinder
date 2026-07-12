import type { RegisteredGym } from "@/stores/create-gym-store";
import type { GymCoach } from "@/stores/owner-coaches-store";
import type { GymEquipment } from "@/stores/owner-equipment-store";
import type { MembershipPlan } from "@/stores/owner-membership-plans-store";
import type { Gym } from "@/lib/mock-gyms";

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
}

const DEFAULT_OWNER: PublicGymOwner = {
  name: "Renz Aballe",
  bio: "Powerlifter and coach for 12 years. I built Abbsy Mini Gym to make serious strength training accessible to my community.",
  avatarUrl:
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
};

const GYM_1_PROFILE: Omit<PublicGymProfile, "id"> = {
  name: "Abbsy Mini Gym",
  location: "Datag Buagsong, Cordova",
  description: "A community-focused mini gym with top-tier equipment.",
  hours: "Mon-Sun: 6AM - 10PM",
  openTime: "6:00 AM",
  closeTime: "10:00 PM",
  website: "abbsy.gym",
  phone: "+63 912 345 6789",
  socialHandle: "@abbsyminigym",
  members: 142,
  rating: 4.7,
  reviewCount: 142,
  image:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  owner: DEFAULT_OWNER,
  plans: [
    {
      id: "plan-monthly",
      name: "Monthly",
      price: 799,
      periodLabel: "/mo",
      durationLabel: "30 days access",
      features: ["Full Gym Access", "Locker Room"],
    },
    {
      id: "plan-quarterly",
      name: "Quarterly",
      price: 2100,
      periodLabel: "/3mo",
      durationLabel: "90 days access",
      features: ["Full Gym Access", "1 Free PT Session"],
      popular: true,
    },
    {
      id: "plan-annual",
      name: "Annual",
      price: 7499,
      periodLabel: "/yr",
      durationLabel: "365 days access",
      features: ["Full Gym Access", "3 Free PT Sessions", "20% off shop"],
    },
  ],
  coaches: [
    {
      id: "coach-power",
      name: "Renz Aballe",
      specialty: "Powerlifting",
      sessionPrice: 500,
      photoUrl:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "coach-mobility",
      name: "Maria Santos",
      specialty: "Mobility & Recovery",
      sessionPrice: 400,
      photoUrl:
        "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=400&q=80",
    },
  ],
  equipment: [
    "Squat Racks (x3)",
    "Deadlift Platform",
    "Dumbbells up to 100lbs",
    "Cable Stack",
    "Treadmills",
  ],
};

const GYM_2_PROFILE: Omit<PublicGymProfile, "id"> = {
  name: "Flex Fitness Studio",
  location: "Mandaue City, Cebu",
  description: "Boutique studio with group classes and open gym access.",
  hours: "Mon-Fri: 6AM - 9PM",
  openTime: "6:00 AM",
  closeTime: "9:00 PM",
  website: "flexfit.studio",
  phone: "+63 917 555 4321",
  socialHandle: "@flexfitstudio",
  members: 0,
  rating: 4.3,
  reviewCount: 0,
  image:
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
  owner: {
    name: "Diana Cruz",
    bio: "Group fitness instructor building a welcoming studio for all fitness levels.",
    avatarUrl:
      "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=200&q=80",
  },
  plans: [
    {
      id: "plan-monthly-2",
      name: "Monthly",
      price: 899,
      periodLabel: "/mo",
      durationLabel: "30 days access",
      features: ["Full Gym Access", "Locker Room"],
    },
  ],
  coaches: [],
  equipment: ["Studio Floor", "Free Weights", "Cardio Machines"],
};

const GYM_3_PROFILE: Omit<PublicGymProfile, "id"> = {
  name: "The Iron Den",
  location: "Cebu City, Cebu",
  description: "Hardcore lifting environment built for serious strength athletes.",
  hours: "Mon-Sat: 5AM - 11PM",
  openTime: "5:00 AM",
  closeTime: "11:00 PM",
  website: "ironden.fit",
  phone: "+63 918 555 9876",
  socialHandle: "@irondenfit",
  members: 87,
  rating: 4.6,
  reviewCount: 87,
  image:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  owner: {
    name: "Marcus Lee",
    bio: "Powerlifting coach focused on building raw strength in a no-frills training space.",
    avatarUrl:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=200&q=80",
  },
  plans: [
    {
      id: "plan-monthly-3",
      name: "Monthly",
      price: 549,
      periodLabel: "/mo",
      durationLabel: "30 days access",
      features: ["Full Gym Access", "Locker Room"],
      popular: true,
    },
  ],
  coaches: [],
  equipment: ["Squat Racks", "Deadlift Platforms", "Bench Stations"],
};

const GYM_4_PROFILE: Omit<PublicGymProfile, "id"> = {
  name: "The Zone Fitness",
  location: "Lapu-Lapu City, Cebu",
  description: "Modern fitness hub with cardio zones, free weights, and recovery area.",
  hours: "Mon-Sun: 6AM - 10PM",
  openTime: "6:00 AM",
  closeTime: "10:00 PM",
  website: "thezone.fit",
  phone: "+63 919 555 2468",
  socialHandle: "@thezonefit",
  members: 203,
  rating: 4.5,
  reviewCount: 203,
  image:
    "https://images.unsplash.com/photo-1540497077202-7bf8a76381cd?auto=format&fit=crop&w=1200&q=80",
  owner: {
    name: "Carla Mendoza",
    bio: "Former competitive lifter building a modern training environment for Cebu athletes.",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
  },
  plans: [
    {
      id: "plan-monthly-4",
      name: "Monthly",
      price: 699,
      periodLabel: "/mo",
      durationLabel: "30 days access",
      features: ["Full Gym Access", "Locker Room"],
      popular: true,
    },
  ],
  coaches: [],
  equipment: ["Cardio Zone", "Free Weights", "Recovery Area"],
};

const STATIC_PROFILES: Record<string, Omit<PublicGymProfile, "id">> = {
  "gym-1": GYM_1_PROFILE,
  "gym-2": GYM_2_PROFILE,
  "gym-3": GYM_3_PROFILE,
  "gym-4": GYM_4_PROFILE,
};

function formatWebsite(slug: string) {
  return slug.replace(/^https?:\/\//i, "").replace(/^@/, "") || "yourgym.com";
}

function parseScheduleHours(schedule: string) {
  const match = schedule.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i);
  if (!match) {
    return { openTime: "6:00 AM", closeTime: "10:00 PM" };
  }
  return { openTime: match[1].toUpperCase(), closeTime: match[2].toUpperCase() };
}

function getPeriodLabel(durationDays: number) {
  if (durationDays <= 31) return "/mo";
  if (durationDays <= 92) return "/3mo";
  return "/yr";
}

function getPlanFeatures(durationDays: number) {
  if (durationDays <= 31) return ["Full Gym Access", "Locker Room"];
  if (durationDays <= 92) return ["Full Gym Access", "1 Free PT Session"];
  return ["Full Gym Access", "3 Free PT Sessions", "20% off shop"];
}

function getDurationLabel(durationDays: number) {
  if (durationDays <= 31) return "30 days access";
  if (durationDays <= 92) return "90 days access";
  return "365 days access";
}

function mapOwnerPlans(plans: MembershipPlan[]): PublicGymPlan[] {
  const sorted = [...plans].sort((a, b) => a.durationDays - b.durationDays);
  const popularIndex = sorted.findIndex((plan) => plan.durationDays === 90);
  const popularId = popularIndex >= 0 ? sorted[popularIndex]?.id : sorted[1]?.id;

  return sorted.slice(0, 3).map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    periodLabel: getPeriodLabel(plan.durationDays),
    durationLabel: getDurationLabel(plan.durationDays),
    features: getPlanFeatures(plan.durationDays),
    popular: plan.id === popularId,
  }));
}

function mapOwnerCoaches(coaches: GymCoach[]): PublicGymCoach[] {
  return coaches.map((coach) => ({
    id: coach.id,
    name: coach.name,
    specialty: coach.specialty,
    sessionPrice: coach.sessionPrice,
    photoUrl: coach.photoUrl,
  }));
}

function mapOwnerEquipment(equipment: GymEquipment[]): string[] {
  return equipment
    .filter((item) => item.status === "available")
    .map((item) => `${item.name} (x${item.quantity})`);
}

function buildFromRegisteredGym(
  gym: RegisteredGym,
  ownerName: string,
  ownerAvatarUrl: string | undefined,
  plans: MembershipPlan[],
  coaches: GymCoach[],
  equipment: GymEquipment[],
): PublicGymProfile {
  const { openTime, closeTime } = parseScheduleHours(gym.schedule);
  const mappedPlans = mapOwnerPlans(plans);

  return {
    id: gym.id,
    name: gym.name,
    location: gym.address,
    description: gym.description,
    hours: gym.schedule,
    openTime,
    closeTime,
    website: formatWebsite(gym.websiteOrSlug),
    phone: gym.contactNumber,
    socialHandle: `@${formatWebsite(gym.websiteOrSlug).split(".")[0]}`,
    members: gym.memberCount,
    rating: 4.8,
    reviewCount: gym.memberCount,
    image: gym.coverImageUrl,
    owner: {
      name: ownerName,
      bio: `Owner of ${gym.name}. Dedicated to helping members train smarter and stay consistent.`,
      avatarUrl:
        ownerAvatarUrl ??
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
    },
    plans:
      mappedPlans.length > 0
        ? mappedPlans
        : [
            {
              id: "plan-default",
              name: "Monthly",
              price: gym.membershipPrice,
              periodLabel: "/mo",
              durationLabel: "30 days access",
              features: ["Full Gym Access", "Locker Room"],
              popular: true,
            },
          ],
    coaches: mapOwnerCoaches(coaches),
    equipment:
      mapOwnerEquipment(equipment).length > 0
        ? mapOwnerEquipment(equipment)
        : ["Full Gym Access", "Locker Room"],
  };
}

function buildFromMockGym(gym: Gym): PublicGymProfile {
  const staticProfile = STATIC_PROFILES[gym.id];
  if (staticProfile) {
    return { id: gym.id, ...staticProfile };
  }

  const { openTime, closeTime } = parseScheduleHours(gym.hours);

  return {
    id: gym.id,
    name: gym.name,
    location: gym.location,
    description: gym.description,
    hours: gym.hours,
    openTime,
    closeTime,
    website: gym.website,
    phone: "+63 900 000 0000",
    socialHandle: `@${gym.website.split(".")[0]}`,
    members: gym.members,
    rating: 4.5,
    reviewCount: gym.members,
    image: gym.image,
    owner: DEFAULT_OWNER,
    plans: [
      {
        id: `${gym.id}-monthly`,
        name: "Monthly",
        price: gym.pricePerMonth,
        periodLabel: "/mo",
        durationLabel: "30 days access",
        features: ["Full Gym Access", "Locker Room"],
        popular: true,
      },
    ],
    coaches: [],
    equipment: ["Gym Floor Access", "Locker Room"],
  };
}

export interface ResolveGymProfileInput {
  gymId: string;
  mockGym?: Gym;
  registeredGym?: RegisteredGym | null;
  ownerName?: string;
  ownerAvatarUrl?: string;
  ownerPlans?: MembershipPlan[];
  ownerCoaches?: GymCoach[];
  ownerEquipment?: GymEquipment[];
}

export function resolveGymProfile(input: ResolveGymProfileInput): PublicGymProfile | null {
  const {
    gymId,
    mockGym,
    registeredGym,
    ownerName = "Gym Owner",
    ownerAvatarUrl,
    ownerPlans = [],
    ownerCoaches = [],
    ownerEquipment = [],
  } = input;

  if (registeredGym?.id === gymId) {
    return buildFromRegisteredGym(
      registeredGym,
      ownerName,
      ownerAvatarUrl,
      ownerPlans,
      ownerCoaches,
      ownerEquipment,
    );
  }

  if (mockGym) {
    return buildFromMockGym(mockGym);
  }

  return null;
}

export function registeredGymToListItem(gym: RegisteredGym): Gym {
  return {
    id: gym.id,
    name: gym.name,
    location: gym.address,
    description: gym.description,
    hours: gym.schedule,
    website: formatWebsite(gym.websiteOrSlug),
    members: gym.memberCount,
    pricePerMonth: gym.membershipPrice,
    image: gym.coverImageUrl,
    status: "PENDING",
  };
}

export function getWebsiteHref(website: string) {
  const clean = formatWebsite(website);
  return clean.startsWith("http") ? clean : `https://${clean}`;
}
