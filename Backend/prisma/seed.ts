import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";


const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Users ────────────────────────────────────────────────────────────────
  // Same hashing method as Backend/src/utils/hash.ts (bcrypt, 12 rounds)
  const passwordHash = await bcrypt.hash("12345", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {
      fullName: "Admin Super",
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      refreshToken: null,
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    },
    create: {
      fullName: "Admin Super",
      email: "admin@test.com",
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@test.com" },
    update: {
      fullName: "Gym Owner",
      passwordHash,
      role: "OWNER",
      emailVerified: true,
      refreshToken: null,
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    },
    create: {
      fullName: "Gym Owner",
      email: "owner@test.com",
      passwordHash,
      role: "OWNER",
      emailVerified: true,
    },
  });

  const clerk = await prisma.user.upsert({
    where: { email: "clerk@test.com" },
    update: {
      fullName: "Ana Reyes",
      passwordHash,
      role: "CLERK",
      emailVerified: true,
      refreshToken: null,
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    },
    create: {
      fullName: "Ana Reyes",
      email: "clerk@test.com",
      passwordHash,
      role: "CLERK",
      emailVerified: true,
    },
  });

  // Gymer uses the existing USER role (dashboard/user)
  const member = await prisma.user.upsert({
    where: { email: "gymer@test.com" },
    update: {
      fullName: "Gymer User",
      passwordHash,
      role: "USER",
      emailVerified: true,
      refreshToken: null,
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    },
    create: {
      fullName: "Gymer User",
      email: "gymer@test.com",
      passwordHash,
      role: "USER",
      emailVerified: true,
    },
  });

  // Keep legacy member account usable with the same password for existing data
  await prisma.user.upsert({
    where: { email: "member@test.com" },
    update: {
      passwordHash,
      role: "USER",
      emailVerified: true,
      refreshToken: null,
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    },
    create: {
      fullName: "Member User",
      email: "member@test.com",
      passwordHash,
      role: "USER",
      emailVerified: true,
    },
  });

  console.log("✅ Users seeded");

  // ─── Gym ──────────────────────────────────────────────────────────────────
  const gym = await prisma.gym.upsert({
    where: { id: "gym-seed-1" },
    update: {},
    create: {
      id: "gym-seed-1",
      name: "Abbsy Mini Gym",
      address: "Datag Buagsong, Cordova",
      description: "A community-focused mini gym with top-tier equipment.",
      contactNumber: "0917 123 4567",
      website: "abbsy.gym",
      coverImageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
      schedule: "Mon-Sun: 6AM - 10PM",
      pricePerMonth: 799,
      status: "ACTIVE",
      ownerId: owner.id,
    },
  });

  // Additional gyms
  await prisma.gym.upsert({
    where: { id: "gym-seed-2" },
    update: {},
    create: {
      id: "gym-seed-2",
      name: "Flex Fitness Studio",
      address: "Mandaue City, Cebu",
      description: "Boutique studio with group classes and open gym access.",
      website: "flexfit.studio",
      coverImageUrl: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
      schedule: "Mon-Fri: 6AM - 9PM",
      pricePerMonth: 899,
      status: "PENDING",
      ownerId: owner.id,
    },
  });

  await prisma.gym.upsert({
    where: { id: "gym-seed-3" },
    update: {},
    create: {
      id: "gym-seed-3",
      name: "The Iron Den",
      address: "Cebu City, Cebu",
      description: "Hardcore lifting environment built for serious strength athletes.",
      website: "ironden.fit",
      coverImageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
      schedule: "Mon-Sat: 5AM - 11PM",
      pricePerMonth: 549,
      status: "ACTIVE",
      ownerId: owner.id,
    },
  });

  await prisma.gym.upsert({
    where: { id: "gym-seed-4" },
    update: {},
    create: {
      id: "gym-seed-4",
      name: "The Zone Fitness",
      address: "Lapu-Lapu City, Cebu",
      description: "Modern fitness hub with cardio zones, free weights, and recovery area.",
      website: "thezone.fit",
      coverImageUrl: "https://images.unsplash.com/photo-1540497077202-7bf8a76381cd?auto=format&fit=crop&w=1200&q=80",
      schedule: "Mon-Sun: 6AM - 10PM",
      pricePerMonth: 699,
      status: "ACTIVE",
      ownerId: owner.id,
    },
  });

  console.log("✅ Gyms seeded");

  // ─── Assign clerk to gym ──────────────────────────────────────────────────
  await prisma.user.update({
    where: { id: clerk.id },
    data: { clerkGymId: gym.id },
  });

  console.log("✅ Clerk assigned to gym");

  // ─── Membership Plans ─────────────────────────────────────────────────────
  const plan1 = await prisma.membershipPlan.upsert({
    where: { id: "plan-seed-1" },
    update: {},
    create: {
      id: "plan-seed-1",
      gymId: gym.id,
      name: "1 Month Basic",
      price: 1000,
      durationDays: 30,
    },
  });

  const plan2 = await prisma.membershipPlan.upsert({
    where: { id: "plan-seed-2" },
    update: {},
    create: {
      id: "plan-seed-2",
      gymId: gym.id,
      name: "3 Months Pro",
      price: 3000,
      durationDays: 90,
    },
  });

  await prisma.membershipPlan.upsert({
    where: { id: "plan-seed-3" },
    update: {},
    create: {
      id: "plan-seed-3",
      gymId: gym.id,
      name: "1 Year Elite",
      price: 20000,
      durationDays: 365,
    },
  });

  console.log("✅ Membership plans seeded");

  // ─── Coaches ──────────────────────────────────────────────────────────────
  const coach1 = await prisma.coach.upsert({
    where: { id: "coach-seed-1" },
    update: {},
    create: {
      id: "coach-seed-1",
      gymId: gym.id,
      name: "Marcus Johnson",
      specialty: "Powerlifting",
      sessionPrice: 1500,
      description: "Certified strength coach with 8 years of competition experience.",
      photoUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80",
      schedule: {
        monday: "6AM - 2PM", tuesday: "6AM - 2PM", wednesday: "6AM - 2PM",
        thursday: "6AM - 2PM", friday: "6AM - 2PM", saturday: "8AM - 12PM", sunday: "Off",
      },
    },
  });

  await prisma.coach.upsert({
    where: { id: "coach-seed-2" },
    update: {},
    create: {
      id: "coach-seed-2",
      gymId: gym.id,
      name: "Elena Cruz",
      specialty: "Yoga & Mobility",
      sessionPrice: 1200,
      description: "Helps members improve flexibility, recovery, and mindful movement.",
      photoUrl: "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=400&q=80",
      schedule: {
        monday: "9AM - 5PM", tuesday: "9AM - 5PM", wednesday: "Off",
        thursday: "9AM - 5PM", friday: "9AM - 5PM", saturday: "10AM - 2PM", sunday: "Off",
      },
    },
  });

  console.log("✅ Coaches seeded");

  // ─── Equipment ────────────────────────────────────────────────────────────
  const equipmentData = [
    { id: "eq-seed-1", name: "Bench Press", quantity: 2, status: "AVAILABLE" as const },
    { id: "eq-seed-2", name: "Squat Rack", quantity: 1, status: "UNAVAILABLE" as const },
    { id: "eq-seed-3", name: "Dumbbell Set", quantity: 3, status: "AVAILABLE" as const },
    { id: "eq-seed-4", name: "Treadmill", quantity: 2, status: "UNAVAILABLE" as const },
  ];

  for (const eq of equipmentData) {
    await prisma.equipment.upsert({
      where: { id: eq.id },
      update: {},
      create: { ...eq, gymId: gym.id },
    });
  }

  console.log("✅ Equipment seeded");

  // ─── Exercises ────────────────────────────────────────────────────────────
  const exercisesData = [
    {
      id: "ex-seed-1", name: "Barbell Back Squat", muscle: "Legs", category: "Lower Body",
      difficulty: "Intermediate", sets: "4", reps: "6-8", rest: "90s",
      targetMuscles: "Legs (Quads, Glutes, Hamstrings)",
      formTips: "Keep your chest up, knees tracking over toes, descend until thighs are parallel.",
      cardImageUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2a4c?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "ex-seed-2", name: "Bench Press", muscle: "Chest", category: "Upper Body — Chest",
      difficulty: "Beginner", sets: "3", reps: "8-10", rest: "60s",
      targetMuscles: "Chest (Pectorals), Triceps, Front Delts",
      formTips: "Retract shoulder blades, lower bar to mid-chest with control.",
      cardImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "ex-seed-3", name: "Deadlift", muscle: "Back/Legs", category: "Full Body",
      difficulty: "Advanced", sets: "4", reps: "3-5", rest: "120s",
      targetMuscles: "Posterior Chain (Hamstrings, Glutes, Erectors, Lats)",
      formTips: "Brace your core, hinge at the hips, keep the bar close to your body.",
      cardImageUrl: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=800&q=80",
    },
  ];

  for (const ex of exercisesData) {
    await prisma.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, gymId: gym.id },
    });
  }

  console.log("✅ Exercises seeded");

  // ─── Shop Products ────────────────────────────────────────────────────────
  const productsData = [
    { id: "prod-seed-1", name: "Whey Protein Isolate", price: 2500, imageUrl: "https://images.unsplash.com/photo-1593095948071-95c0516bc6f5?auto=format&fit=crop&w=600&q=80" },
    { id: "prod-seed-2", name: "GymOS Shaker Bottle", price: 450, imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80" },
    { id: "prod-seed-3", name: "Pre-Workout Energy", price: 1200, imageUrl: "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=600&q=80" },
    { id: "prod-seed-4", name: "Lifting Belt", price: 800, imageUrl: "https://images.unsplash.com/photo-1517964608845-3459937cc327?auto=format&fit=crop&w=600&q=80" },
  ];

  for (const prod of productsData) {
    await prisma.shopProduct.upsert({
      where: { id: prod.id },
      update: {},
      create: { ...prod, gymId: gym.id },
    });
  }

  console.log("✅ Shop products seeded");

  // ─── Owner Subscription ───────────────────────────────────────────────────
  const validUntil = new Date();
  validUntil.setMonth(validUntil.getMonth() + 3);

  await prisma.ownerSubscription.upsert({
    where: { id: "sub-seed-1" },
    update: {},
    create: {
      id: "sub-seed-1",
      ownerId: owner.id,
      gymId: gym.id,
      planId: "standard",
      planName: "Standard",
      price: 699,
      months: 3,
      referenceNo: "XDT-8842011",
      method: "Xendit",
      validUntil,
    },
  });

  console.log("✅ Owner subscriptions seeded");

  // ─── Sample Membership ────────────────────────────────────────────────────
  const memberExpiresAt = new Date();
  memberExpiresAt.setDate(memberExpiresAt.getDate() + 85);

  await prisma.gymMembership.upsert({
    where: { id: "mem-seed-1" },
    update: {},
    create: {
      id: "mem-seed-1",
      userId: member.id,
      gymId: gym.id,
      planId: plan2.id,
      coachId: coach1.id,
      paymentMethod: "CASHLESS",
      paymentRef: "XDT-SEED-001",
      totalPaid: 3000,
      status: "ACTIVE",
      expiresAt: memberExpiresAt,
    },
  });

  console.log("✅ Memberships seeded");

  // ─── Admin Activities ─────────────────────────────────────────────────────
  const activities = [
    { message: "Powerhouse Fitness approved", tone: "SUCCESS" as const },
    { message: "New transaction ₱1,200", tone: "INFO" as const },
    { message: "Elite Fitness Cebu updated profile", tone: "INFO" as const },
    { message: "New gym application: Davao Strength", tone: "WARNING" as const },
    { message: "System backup completed", tone: "SUCCESS" as const },
  ];

  for (const act of activities) {
    await prisma.adminActivity.create({ data: act });
  }

  console.log("✅ Admin activities seeded");

  console.log("\n🎉 Database seeded successfully!\n");
  console.log("📧 Test accounts (password: 12345):");
  console.log("   Admin:     admin@test.com");
  console.log("   Gym Owner: owner@test.com");
  console.log("   Clerk:     clerk@test.com");
  console.log("   Gymer:     gymer@test.com\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
