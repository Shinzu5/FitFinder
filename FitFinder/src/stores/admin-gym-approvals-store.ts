"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export type GymApplicationStatus = "pending" | "approved" | "declined";

export interface GymApplication {
  id: string;
  gymName: string;
  ownerName: string;
  ownerEmail: string;
  contactNumber: string;
  location: string;
  imageUrl: string;
  websiteSlug: string;
  apiKey: string;
  planName: string;
  planPrice: number;
  submittedAt: number;
  status: GymApplicationStatus;
  reviewedAt?: number;
}

export function formatSubmittedDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

interface AdminGymApprovalsState {
  applications: GymApplication[];
  loading: boolean;
  fetchApplications: () => Promise<void>;
  approveApplication: (id: string) => Promise<GymApplication | null>;
  declineApplication: (id: string) => Promise<GymApplication | null>;
  getPendingCount: () => number;
}

export const useAdminGymApprovalsStore = create<AdminGymApprovalsState>()(
  persist(
    (set, get) => ({
      applications: [],
      loading: false,

      fetchApplications: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/admin/gym-applications");
          if (data.success) {
            set({ applications: data.data, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch applications:", error);
        }
        set({ loading: false });
      },

      approveApplication: async (id) => {
        try {
          const { data } = await api.put(`/admin/gym-applications/${id}/approve`);
          if (data.success) {
            set({
              applications: get().applications.map((item) =>
                item.id === id
                  ? { ...item, status: "approved" as const, reviewedAt: Date.now() }
                  : item
              ),
            });
            return get().applications.find((item) => item.id === id) || null;
          }
        } catch (error) {
          console.error("Failed to approve application:", error);
        }
        return null;
      },

      declineApplication: async (id) => {
        try {
          const { data } = await api.put(`/admin/gym-applications/${id}/decline`);
          if (data.success) {
            set({
              applications: get().applications.map((item) =>
                item.id === id
                  ? { ...item, status: "declined" as const, reviewedAt: Date.now() }
                  : item
              ),
            });
            return get().applications.find((item) => item.id === id) || null;
          }
        } catch (error) {
          console.error("Failed to decline application:", error);
        }
        return null;
      },

      getPendingCount: () =>
        get().applications.filter((item) => item.status === "pending").length,
    }),
    {
      name: "fitfinder-admin-gym-approvals-v2",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
