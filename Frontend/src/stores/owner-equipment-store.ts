"use client";

import { create } from "zustand";
import api from "@/lib/api";

export type EquipmentStatus = "available" | "in_use" | "under_maintenance";

export interface GymEquipment {
  id: string;
  name: string;
  quantity: number;
  status: EquipmentStatus;
}

export type GymEquipmentInput = Omit<GymEquipment, "id" | "status"> & {
  status?: EquipmentStatus;
};

function normalizeStatus(status: string | undefined): EquipmentStatus {
  const value = (status || "available").toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "in_use") return "in_use";
  if (value === "under_maintenance" || value === "unavailable") return "under_maintenance";
  return "available";
}

function mapEquipment(raw: any): GymEquipment {
  return {
    id: raw.id,
    name: raw.name,
    quantity: raw.quantity ?? 1,
    status: normalizeStatus(raw.status),
  };
}

const STATUS_CYCLE: EquipmentStatus[] = ["available", "in_use", "under_maintenance"];

interface OwnerEquipmentState {
  equipment: GymEquipment[];
  loading: boolean;
  fetchEquipment: () => Promise<void>;
  addEquipment: (item: GymEquipmentInput) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<GymEquipmentInput & { status: EquipmentStatus }>) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
  removeEquipment: (id: string) => Promise<void>;
}

export const useOwnerEquipmentStore = create<OwnerEquipmentState>((set, get) => ({
  equipment: [],
  loading: false,

  fetchEquipment: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/owner/equipment");
      if (data.success) {
        set({ equipment: (data.data || []).map(mapEquipment), loading: false });
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
        name: item.name,
        quantity: item.quantity,
        status: (item.status || "available").toUpperCase(),
      });
      if (data.success) {
        set({ equipment: [...get().equipment, mapEquipment(data.data)] });
      }
    } catch (error) {
      console.error("Failed to add equipment:", error);
    }
  },

  updateEquipment: async (id, updates) => {
    try {
      const payload: Record<string, unknown> = {};
      if (typeof updates.name === "string") payload.name = updates.name;
      if (typeof updates.quantity === "number") payload.quantity = updates.quantity;
      if (updates.status) payload.status = updates.status.toUpperCase();

      const { data } = await api.put(`/owner/equipment/${id}`, payload);
      if (data.success) {
        set({
          equipment: get().equipment.map((entry) =>
            entry.id === id ? mapEquipment(data.data) : entry,
          ),
        });
      }
    } catch (error) {
      console.error("Failed to update equipment:", error);
    }
  },

  toggleStatus: async (id) => {
    try {
      const { data } = await api.put(`/owner/equipment/${id}/toggle`);
      if (data.success) {
        set({
          equipment: get().equipment.map((entry) =>
            entry.id === id ? mapEquipment(data.data) : entry,
          ),
        });
        return;
      }
    } catch (error) {
      console.error("Failed to toggle equipment:", error);
    }

    // Optimistic local cycle if request fails mid-session
    set({
      equipment: get().equipment.map((entry) => {
        if (entry.id !== id) return entry;
        const idx = STATUS_CYCLE.indexOf(entry.status);
        return { ...entry, status: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] };
      }),
    });
  },

  removeEquipment: async (id) => {
    try {
      const { data } = await api.delete(`/owner/equipment/${id}`);
      if (data.success) {
        set({ equipment: get().equipment.filter((entry) => entry.id !== id) });
      }
    } catch (error) {
      console.error("Failed to remove equipment:", error);
    }
  },
}));

export function getEquipmentStatusLabel(status: EquipmentStatus) {
  if (status === "in_use") return "In Use";
  if (status === "under_maintenance") return "Under Maintenance";
  return "Available";
}

export function getEquipmentStatusStyles(status: EquipmentStatus) {
  if (status === "in_use") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20";
  }
  if (status === "under_maintenance") {
    return "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20";
}
