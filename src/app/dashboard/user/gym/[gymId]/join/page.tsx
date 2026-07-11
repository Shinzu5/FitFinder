"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGymProfile } from "../../../_lib/use-gym-profile";
import { JoinSelectPayment } from "../../../_components/join-gym/JoinSelectPayment";

export default function JoinGymPage() {
  const router = useRouter();
  const params = useParams();
  const gymId = params.gymId as string;
  const profile = useGymProfile(gymId);

  useEffect(() => {
    if (profile === null) {
      router.replace("/dashboard/user");
    }
  }, [profile, router]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }

  return <JoinSelectPayment profile={profile} />;
}
