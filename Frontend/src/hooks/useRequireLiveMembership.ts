"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMembershipStore } from "@/stores/membership-store";

/**
 * Feature pages (Exercises, Shop, …) require a LIVE selected gym.
 * Pending / approved-not-done gyms must not load gym data.
 */
export function useRequireLiveMembership(opts?: { redirectTo?: string }) {
  const router = useRouter();
  const joinedGymId = useMembershipStore((s) => s.joinedGymId);
  const fetchMembership = useMembershipStore((s) => s.fetchMembership);
  const [ready, setReady] = useState(false);
  const redirectTo = opts?.redirectTo ?? "/dashboard/user/membership";

  useEffect(() => {
    void (async () => {
      await fetchMembership();
      setReady(true);
    })();
  }, [fetchMembership]);

  useEffect(() => {
    if (!ready) return;
    if (!joinedGymId) {
      router.replace(redirectTo);
    }
  }, [ready, joinedGymId, router, redirectTo]);

  return { ready, joinedGymId, allowed: ready && Boolean(joinedGymId) };
}
