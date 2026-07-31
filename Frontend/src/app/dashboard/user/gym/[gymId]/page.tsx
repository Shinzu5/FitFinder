"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { GymProfileView } from "../../_components/GymProfileView";
import { useGymProfile } from "../../_lib/use-gym-profile";

export default function UserGymProfilePage() {
  const params = useParams();
  const gymId = typeof params.gymId === "string" ? params.gymId : "";
  const { profile, loading } = useGymProfile(gymId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FACC15] border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-lg font-semibold text-white">Gym not found</p>
          <p className="text-sm text-zinc-500">
            This gym may be unavailable or pending approval.
          </p>
          <Link
            href="/dashboard/user"
            className="inline-flex rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-black"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return <GymProfileView profile={profile} />;
}
