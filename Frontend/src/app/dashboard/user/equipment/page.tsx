"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import {
  getEquipmentStatusLabel,
  type EquipmentStatus,
} from "@/stores/owner-equipment-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useMemberGymContentStore } from "@/stores/member-gym-content-store";

function getUserEquipmentStatusStyles(status: EquipmentStatus) {
  if (status === "in_use") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-400";
  }
  if (status === "under_maintenance") {
    return "border-red-500/25 bg-red-500/10 text-red-400";
  }
  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
}

function StatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getUserEquipmentStatusStyles(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {getEquipmentStatusLabel(status)}
    </span>
  );
}

export default function EquipmentPage() {
  const router = useRouter();
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const equipment = useMemberGymContentStore((state) => state.equipment);
  const loading = useMemberGymContentStore((state) => state.loadingEquipment);
  const error = useMemberGymContentStore((state) => state.equipmentError);
  const fetchEquipment = useMemberGymContentStore((state) => state.fetchEquipment);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await fetchMembership();
      setReady(true);
    })();
  }, [fetchMembership]);

  useEffect(() => {
    if (!ready) return;
    if (!joinedGymId) {
      router.replace("/dashboard/user");
      return;
    }
    void fetchEquipment();
  }, [ready, joinedGymId, fetchEquipment, router]);

  if (!ready || !joinedGymId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-white">Gym Equipment Status</h1>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-6 py-4 font-semibold">Equipment</th>
                <th className="px-6 py-4 font-semibold">Qty</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && equipment.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                    Loading equipment…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                    {error}
                  </td>
                </tr>
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                    No equipment listed yet. Your gym owner will update availability here.
                  </td>
                </tr>
              ) : (
                equipment.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-[#131315]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Dumbbell className="h-5 w-5 text-zinc-600" />
                          )}
                        </div>
                        <span className="font-medium text-white">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{item.quantity}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
