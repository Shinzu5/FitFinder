"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { MyGymPanel } from "../_components/MyGymPanel";

const CREATE_GYM_PREFIX = "/dashboard/user/create-gym";

export default function OwnerMyGymPage() {
  const router = useRouter();
  const registeredGym = useCreateGymStore((state) => state.registeredGym);
  const fetchOwnedGymStatus = useCreateGymStore((state) => state.fetchOwnedGymStatus);
  const demoteToUser = useAuthStore((state) => state.demoteToUser);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verifyGymStillExists() {
      const hasGym = await fetchOwnedGymStatus({ full: true });
      if (cancelled) return;
      if (!hasGym) {
        const createGym = useCreateGymStore.getState();
        const stillPaid = createGym.paymentComplete;
        if (!stillPaid) {
          createGym.resetFlow();
        }
        demoteToUser();
        router.replace(
          stillPaid ? `${CREATE_GYM_PREFIX}/register` : CREATE_GYM_PREFIX,
        );
        return;
      }
      setChecking(false);
    }

    void verifyGymStillExists();
    return () => {
      cancelled = true;
    };
  }, [fetchOwnedGymStatus, demoteToUser, router]);

  if (checking || !registeredGym) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Checking gym…
      </div>
    );
  }

  return <MyGymPanel />;
}
