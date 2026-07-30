"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { GcashSuccessView } from "../../../../../_components/join-gym/GcashSuccessView";

export default function JoinGcashSuccessPage() {
  const params = useParams();
  const gymId = params.gymId as string;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading payment status...
        </div>
      }
    >
      <GcashSuccessView gymId={gymId} />
    </Suspense>
  );
}
