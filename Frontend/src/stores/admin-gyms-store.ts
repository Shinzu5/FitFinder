"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";

export interface AdminActiveGym {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  members: number;
  activeSubscriptions: number;
  status: "active";
  ownerName: string;
  ownerEmail: string;
  ownerInitials: string;
  planLabel: string;
  paymentConfigured: boolean;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

interface AdminGymsState {
  gyms: AdminActiveGym[];
  loading: boolean;
  error: string | null;
  fetchGyms: () => Promise<void>;
  deleteGym: (id: string) => Promise<boolean>;
}

export const useAdminGymsStore = create<AdminGymsState>((set, get) => ({
  gyms: [],
  loading: false,
  error: null,

  fetchGyms: async () => {
    set({ loading: true, error: null });
    try {
      // ACTIVE gyms only — same source Gymers see on Home
      const { data } = await api.get("/gyms");
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load gyms." });
        return;
      }

      const gyms: AdminActiveGym[] = (data.data || []).map((gym: any) => ({
        id: gym.id,
        name: gym.name,
        location: gym.location || gym.address || "",
        imageUrl: resolveMediaUrl(gym.image || gym.coverImageUrl, ""),
        members: gym.members ?? 0,
        activeSubscriptions: gym.members ?? 0,
        status: "active" as const,
        ownerName: gym.ownerName || "Owner",
        ownerEmail: gym.ownerEmail || "",
        ownerInitials: initials(gym.ownerName || gym.name || "G"),
        planLabel: "Membership",
        paymentConfigured: true,
      }));

      set({ gyms, loading: false, error: null });
    } catch (error: any) {
      set({
        loading: false,
        error: error.response?.data?.message || "Failed to load gyms.",
      });
    }
  },

  deleteGym: async (id) => {
    try {
      const { data } = await api.delete(`/gyms/${id}`);
      if (!data.success) {
        console.error("Delete gym failed:", data.message);
        set({ error: data.message || "Failed to delete gym." });
        return false;
      }
      set({ gyms: get().gyms.filter((gym) => gym.id !== id), error: null });
      return true;
    } catch (error: any) {
      console.error("Failed to delete gym:", error);
      set({
        error: error.response?.data?.message || "Failed to delete gym.",
      });
      return false;
    }
  },
}));
