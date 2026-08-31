"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy onboarding plans step — 3-plan publish gate removed.
 * Membership plans are managed anytime from Owner › Memberships.
 */
export default function CreateGymPlansPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/owner/payment-settings");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
      Redirecting…
    </div>
  );
}
