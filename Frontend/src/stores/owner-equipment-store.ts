"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

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

interface OwnerEquipmentState {
  equipment: GymEquipment[];
  loading: boolean;
  fetchEquipment: () => Promise<void>;
  addEquipment: (item: GymEquipmentInput) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  removeEquipment: (id: string) => Promise<void>;
}

export const useOwnerEquipmentStore = create<OwnerEquipmentState>()(
  persist(
    (set, get) => ({
      equipment: [],
      loading: false,

      fetchEquipment: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/owner/equipment");
          if (data.success) {
            const mapped = data.data.map((e: any) => ({
              ...e,
              status: e.status?.toLowerCase() || "available",
            }));
            set({ equipment: mapped, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch equipment:", error);
        }
        set({ loading: false });
      },

      addEquipment: async (item) => {
        try {
          const { data } = await api.post("/owner/equipment", {
            ...item,
            status: (item.status || "available").toUpperCase(),
          });
          if (data.success) {
            set({
              equipment: [
                ...get().equipment,
                { ...data.data, status: data.data.status?.toLowerCase() || "available" },
              ],
            });
            return;
          }
        } catch (error) {
          console.error("Failed to add equipment:", error);
        }
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

      toggleStatus: async (id) => {
        try {
          await api.put(`/owner/equipment/${id}/toggle`);
        } catch (error) {
          console.error("Failed to toggle equipment:", error);
        }
        set({
          equipment: get().equipment.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status: entry.status === "available" ? "unavailable" as const : "available" as const,
                }
              : entry,
          ),
        });
      },

      removeEquipment: async (id) => {
        try {
          await api.delete(`/owner/equipment/${id}`);
        } catch (error) {
          console.error("Failed to remove equipment:", error);
        }
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
