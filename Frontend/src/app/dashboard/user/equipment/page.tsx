"use client";

import {
  getEquipmentStatusLabel,
  useOwnerEquipmentStore,
  type EquipmentStatus,
} from "@/stores/owner-equipment-store";

function getUserEquipmentStatusStyles(status: EquipmentStatus) {
  return status === "available"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
    : "border-red-500/25 bg-red-500/10 text-red-400";
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
  const equipment = useOwnerEquipmentStore((state) => state.equipment);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-white">Gym Equipment Status</h1>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-6 py-4 font-semibold">Equipment</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-zinc-500">
                    No equipment listed yet. Your gym owner will update availability here.
                  </td>
                </tr>
              ) : (
                equipment.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-800/50 last:border-0"
                  >
                    <td className="px-6 py-4 font-medium text-white">{item.name}</td>
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
