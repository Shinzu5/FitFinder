"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGymProfile } from "../../../_lib/use-gym-profile";
import { JoinSelectPayment } from "../../../_components/join-gym/JoinSelectPayment";

function JoinGymContent() {
  const router = useRouter();
  const params = useParams();
  const gymId = params.gymId as string;
  const { profile, loading } = useGymProfile(gymId);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/dashboard/user");
      return;
    }
    // Join/purchase requires at least one active Membership Plan
    if (!loading && profile && profile.plans.length === 0) {
      router.replace(`/dashboard/user/gym/${gymId}`);
    }
  }, [loading, profile, router, gymId]);

  if (loading || !profile || profile.plans.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        {profile && profile.plans.length === 0
          ? "No membership plans available."
          : "Loading…"}
      </div>
    );
  }

  return <JoinSelectPayment profile={profile} />;
}

export default function JoinGymPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading…
        </div>
      }
    >
      <JoinGymContent />
    </Suspense>
  );
}
