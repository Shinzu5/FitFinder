"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGymProfile } from "../../../_lib/use-gym-profile";
import { JoinSelectPayment } from "../../../_components/join-gym/JoinSelectPayment";

export default function JoinGymPage() {
  const router = useRouter();
  const params = useParams();
  const gymId = params.gymId as string;
  const { profile, loading } = useGymProfile(gymId);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/dashboard/user");
    }
  }, [loading, profile, router]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }

  return <JoinSelectPayment profile={profile} />;
}
