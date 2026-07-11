"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getEquipmentStatusLabel,
  getEquipmentStatusStyles,
  useOwnerEquipmentStore,
} from "@/stores/owner-equipment-store";

export function EquipmentPanel() {
  const equipment = useOwnerEquipmentStore((state) => state.equipment);
  const addEquipment = useOwnerEquipmentStore((state) => state.addEquipment);
  const toggleStatus = useOwnerEquipmentStore((state) => state.toggleStatus);
  const removeEquipment = useOwnerEquipmentStore((state) => state.removeEquipment);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const qty = Number(quantity);

    if (!trimmedName) {
      setError("Please enter an equipment name.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      setError("Please enter a valid whole number quantity.");
      return;
    }

    addEquipment({ name: trimmedName, quantity: qty });
    setName("");
    setQuantity("");
    setError(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-zinc-500">
                <th className="pb-3 pr-4 font-medium">Equipment</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-zinc-500">
                    No equipment yet. Add your first item on the right.
                  </td>
                </tr>
              ) : (
                equipment.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 last:border-0">
                    <td className="py-4 pr-4 font-medium text-white">{item.name}</td>
                    <td className="py-4 pr-4 text-zinc-400">{item.quantity}</td>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(item.id)}
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${getEquipmentStatusStyles(item.status)}`}
                      >
                        {getEquipmentStatusLabel(item.status)}
                      </button>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeEquipment(item.id)}
                        className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Click the status badge to toggle availability. Members see this in real time.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
        <h2 className="mb-5 text-lg font-semibold text-white">Add Equipment</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="equipmentName">Name</Label>
            <Input
              id="equipmentName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipmentQty">Quantity</Label>
            <Input
              id="equipmentQty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            Add Equipment
          </button>
        </form>
      </section>
    </div>
  );
}
