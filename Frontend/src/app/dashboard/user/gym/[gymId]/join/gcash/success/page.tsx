"use client";

import { useParams } from "next/navigation";
import { GcashSuccessView } from "../../../../../_components/join-gym/GcashSuccessView";

export default function JoinGcashSuccessPage() {
  const params = useParams();
  const gymId = params.gymId as string;

  return <GcashSuccessView gymId={gymId} />;
}
