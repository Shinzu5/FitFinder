"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMembershipStore } from "@/stores/membership-store";
import { UserMessagesPanel } from "../_components/UserMessagesPanel";

export default function MessagesPage() {
  const router = useRouter();
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await fetchMembership();
      setReady(true);
    })();
  }, [fetchMembership]);

  useEffect(() => {
    if (ready && !joinedGymId) {
      router.replace("/dashboard/user/membership");
    }
  }, [ready, joinedGymId, router]);

  if (!ready || !joinedGymId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <UserMessagesPanel />
    </div>
  );
}
