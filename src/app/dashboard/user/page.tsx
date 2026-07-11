"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { EmptyGymState } from "@/components/features/dashboard/EmptyGymState";
import { GymCard } from "@/components/features/dashboard/GymCard";
import { useAuthStore } from "@/stores/auth-store";
import { useDashboardStore } from "@/stores/dashboard-store";

export default function UserDashboardPage() {
  const { user } = useAuthStore();
  const { gyms, refreshGyms } = useDashboardStore();

  if (!user) {
    return null;
  }

  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Welcome Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-zinc-400 text-sm">
            Browse gyms below, or create your own.
          </p>
        </div>

        <Link
          href="/dashboard/user/create-gym"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
        >
          <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
          Create a Gym
        </Link>
      </div>

      {/* Available Gyms Section */}
      <section className="space-y-5">
        <h2 className="text-lg font-bold text-white tracking-wide">
          Available Gyms
        </h2>

        {gyms.length === 0 ? (
          <EmptyGymState onRefresh={refreshGyms} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {gyms.map((gym) => (
              <GymCard key={gym.id} gym={gym} />
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
