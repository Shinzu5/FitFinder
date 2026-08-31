"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Gym admin approval removed — gyms auto-publish after Owner plan purchase. */
export default function GymApprovalsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/admin");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
      Redirecting…
    </div>
  );
}
