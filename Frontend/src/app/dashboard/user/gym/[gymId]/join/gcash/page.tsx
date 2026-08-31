"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGymProfile } from "../../../../_lib/use-gym-profile";
import { GcashPaymentView } from "../../../../_components/join-gym/GcashPaymentView";

export default function JoinGcashPage() {
  const router = useRouter();
  const params = useParams();
  const gymId = params.gymId as string;
  const { profile, loading } = useGymProfile(gymId);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/dashboard/user");
      return;
    }
    if (!loading && profile && profile.plans.length === 0) {
      router.replace(`/dashboard/user/gym/${gymId}`);
      return;
    }
    if (!loading && profile && !profile.cashlessEnabled) {
      router.replace(`/dashboard/user/gym/${gymId}/join`);
    }
  }, [loading, profile, router, gymId]);

  if (loading || !profile || !profile.cashlessEnabled || profile.plans.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        {profile && profile.plans.length === 0
          ? "No membership plans available."
          : "Loading…"}
      </div>
    );
  }

  return <GcashPaymentView profile={profile} />;
}
