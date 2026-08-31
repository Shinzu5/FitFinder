"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GymProfileView } from "../../_components/GymProfileView";
import { useGymProfile } from "../../_lib/use-gym-profile";
import { resolveGymAccessStatus } from "@/lib/gym-access";
import { useMembershipStore } from "@/stores/membership-store";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";

export default function UserGymProfilePage() {
  const params = useParams();
  const router = useRouter();
  const gymId = typeof params.gymId === "string" ? params.gymId : "";
  const { profile, loading } = useGymProfile(gymId);
  const enrolledGymIds = useMembershipStore((s) => s.enrolledGymIds);
  const requests = useWalkInApprovalsStore((s) => s.requests);

  // Pending / approved-not-done for this gym → Membership only (no gym dashboard)
  useEffect(() => {
    if (!gymId) return;
    const status = resolveGymAccessStatus(gymId);
    if (status === "pending" || status === "approved") {
      router.replace("/dashboard/user/membership");
    }
  }, [gymId, enrolledGymIds, requests, router]);

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

  const access = resolveGymAccessStatus(gymId);
  if (access === "pending" || access === "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-zinc-500">Waiting for Owner/Clerk Approval…</p>
      </div>
    );
  }

  return <GymProfileView profile={profile} />;
}
