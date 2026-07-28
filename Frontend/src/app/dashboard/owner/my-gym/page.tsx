"use client";

import { useCreateGymStore } from "@/stores/create-gym-store";
import { MyGymPanel } from "../_components/MyGymPanel";
import { OwnerPlaceholderPage } from "../_components/OwnerPlaceholderPage";

export default function OwnerMyGymPage() {
  const registeredGym = useCreateGymStore((state) => state.registeredGym);

  if (!registeredGym) {
    return (
      <OwnerPlaceholderPage description="Register your gym first to manage your listing here." />
    );
  }

  return <MyGymPanel />;
}
