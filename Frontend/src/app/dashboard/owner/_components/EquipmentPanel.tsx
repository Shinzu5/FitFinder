"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getEquipmentStatusLabel,
  getEquipmentStatusStyles,
  useOwnerEquipmentStore,
  type GymEquipment,
} from "@/stores/owner-equipment-store";

export function EquipmentPanel() {
  const equipment = useOwnerEquipmentStore((state) => state.equipment);
  const loading = useOwnerEquipmentStore((state) => state.loading);
  const fetchEquipment = useOwnerEquipmentStore((state) => state.fetchEquipment);
  const addEquipment = useOwnerEquipmentStore((state) => state.addEquipment);
  const updateEquipment = useOwnerEquipmentStore((state) => state.updateEquipment);
  const toggleStatus = useOwnerEquipmentStore((state) => state.toggleStatus);
  const removeEquipment = useOwnerEquipmentStore((state) => state.removeEquipment);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchEquipment();
    const id = window.setInterval(() => void fetchEquipment(), 15000);
    return () => window.clearInterval(id);
  }, [fetchEquipment]);

  function resetForm() {
    setName("");
    setQuantity("");
    setEditingId(null);
    setError(null);
  }

  function startEdit(item: GymEquipment) {
    setEditingId(item.id);
    setName(item.name);
    setQuantity(String(item.quantity));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
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

    if (editingId) {
      await updateEquipment(editingId, { name: trimmedName, quantity: qty });
    } else {
      await addEquipment({ name: trimmedName, quantity: qty });
    }
    resetForm();
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
              {loading && equipment.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-zinc-500">
                    Loading equipment…
                  </td>
                </tr>
              ) : equipment.length === 0 ? (
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
                        onClick={() => void toggleStatus(item.id)}
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${getEquipmentStatusStyles(item.status)}`}
                        title="Click to cycle status"
                      >
                        {getEquipmentStatusLabel(item.status)}
                      </button>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeEquipment(item.id)}
                          className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Click the status badge to cycle: Available → In Use → Under Maintenance. Members see
          updates automatically.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
        <h2 className="mb-5 text-lg font-semibold text-white">
          {editingId ? "Edit Equipment" : "Add Equipment"}
        </h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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

          <div className="flex gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
            >
              {editingId ? "Save Changes" : "Add Equipment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
