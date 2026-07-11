"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EquipmentStatus = "available" | "unavailable";

export interface GymEquipment {
  id: string;
  name: string;
  quantity: number;
  status: EquipmentStatus;
}

export type GymEquipmentInput = Omit<GymEquipment, "id" | "status"> & {
  status?: EquipmentStatus;
};

const DEFAULT_EQUIPMENT: GymEquipment[] = [
  { id: "equipment-1", name: "Bench Press", quantity: 2, status: "available" },
  { id: "equipment-2", name: "Squat Rack", quantity: 1, status: "unavailable" },
  { id: "equipment-3", name: "Dumbbell Set", quantity: 3, status: "available" },
  { id: "equipment-4", name: "Treadmill", quantity: 2, status: "unavailable" },
];

interface OwnerEquipmentState {
  equipment: GymEquipment[];
  addEquipment: (item: GymEquipmentInput) => void;
  toggleStatus: (id: string) => void;
  removeEquipment: (id: string) => void;
}

export const useOwnerEquipmentStore = create<OwnerEquipmentState>()(
  persist(
    (set, get) => ({
      equipment: DEFAULT_EQUIPMENT,

      addEquipment: (item) => {
        set({
          equipment: [
            ...get().equipment,
            {
              id: `equipment-${Date.now()}`,
              name: item.name.trim(),
              quantity: item.quantity,
              status: item.status ?? "available",
            },
          ],
        });
      },

      toggleStatus: (id) => {
        set({
          equipment: get().equipment.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status: entry.status === "available" ? "unavailable" : "available",
                }
              : entry,
          ),
        });
      },

      removeEquipment: (id) => {
        set({ equipment: get().equipment.filter((entry) => entry.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-equipment",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getEquipmentStatusLabel(status: EquipmentStatus) {
  return status === "available" ? "Available" : "Not Available";
}

export function getEquipmentStatusStyles(status: EquipmentStatus) {
  return status === "available"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
    : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20";
}
