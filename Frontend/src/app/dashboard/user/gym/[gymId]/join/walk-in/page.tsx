"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGymProfile } from "../../../../_lib/use-gym-profile";
import { WalkInRegistrationView } from "../../../../_components/join-gym/WalkInRegistrationView";

function JoinWalkInContent() {
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

  return <WalkInRegistrationView profile={profile} />;
}

export default function JoinWalkInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading…
        </div>
      }
    >
      <JoinWalkInContent />
    </Suspense>
  );
}
