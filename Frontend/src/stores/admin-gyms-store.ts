"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";

export type GymSubscriptionStatus = "active" | "expired" | "pending" | "none";
export type GymDisplayStatus = "active" | "expired" | "pending";

export interface AdminActiveGym {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  members: number;
  activeSubscriptions: number;
  status: GymDisplayStatus;
  publishedStatus: "published";
  subscriptionStatus: GymSubscriptionStatus;
  ownerName: string;
  ownerEmail: string;
  ownerInitials: string;
  planLabel: string;
  planPrice: number | null;
  paymentConfigured: boolean;
  planDaysLeft: number | null;
  planValidUntil: string | null;
  planExpired: boolean | null;
  planPaidAt: string | null;
  planMonths: number | null;
  subscriptionStartDate: string | null;
  subscriptionExpirationDate: string | null;
  remainingDays: number | null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function mapStatus(raw: unknown): GymDisplayStatus {
  const s = String(raw || "").toLowerCase();
  if (s === "expired") return "expired";
  if (s === "pending") return "pending";
  if (s === "active") return "active";
  return "pending";
}

function mapSubStatus(raw: unknown): GymSubscriptionStatus {
  const s = String(raw || "").toLowerCase();
  if (s === "active" || s === "expired" || s === "pending" || s === "none") return s;
  return "none";
}

interface AdminGymsState {
  gyms: AdminActiveGym[];
  loading: boolean;
  error: string | null;
  fetchGyms: (opts?: { silent?: boolean }) => Promise<void>;
  deleteGym: (id: string) => Promise<boolean>;
}

export const useAdminGymsStore = create<AdminGymsState>((set, get) => ({
  gyms: [],
  loading: false,
  error: null,

  fetchGyms: async (opts) => {
    const silent = Boolean(opts?.silent) || get().gyms.length > 0;
    if (!silent) set({ loading: true, error: null });
    try {
      const { data } = await api.get("/admin/gyms");
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load gyms." });
        return;
      }

      const gyms: AdminActiveGym[] = (data.data || []).map(
        (gym: Record<string, unknown>) => {
          const planDaysLeft =
            typeof gym.planDaysLeft === "number"
              ? gym.planDaysLeft
              : typeof gym.remainingDays === "number"
                ? gym.remainingDays
                : null;

          return {
            id: String(gym.id),
            name: String(gym.name || ""),
            location: String(gym.location || gym.address || ""),
            imageUrl: resolveMediaUrl(
              String(gym.imageUrl || gym.coverImageUrl || ""),
              "",
            ),
            members: Number(gym.members) || 0,
            activeSubscriptions: Number(gym.members) || 0,
            status: mapStatus(gym.status),
            publishedStatus: "published" as const,
            subscriptionStatus: mapSubStatus(gym.subscriptionStatus),
            ownerName: String(gym.ownerName || "Owner"),
            ownerEmail: String(gym.ownerEmail || ""),
            ownerInitials: initials(String(gym.ownerName || gym.name || "G")),
            planLabel: String(gym.planName || "No plan"),
            planPrice: typeof gym.planPrice === "number" ? gym.planPrice : null,
            paymentConfigured: Boolean(gym.paymentConfigured),
            planDaysLeft,
            planValidUntil:
              (gym.planValidUntil as string | null) ??
              (gym.subscriptionExpirationDate as string | null) ??
              null,
            planExpired:
              typeof gym.planExpired === "boolean" ? gym.planExpired : null,
            planPaidAt:
              (gym.planPaidAt as string | null) ??
              (gym.subscriptionStartDate as string | null) ??
              null,
            planMonths: typeof gym.planMonths === "number" ? gym.planMonths : null,
            subscriptionStartDate:
              (gym.subscriptionStartDate as string | null) ??
              (gym.planPaidAt as string | null) ??
              null,
            subscriptionExpirationDate:
              (gym.subscriptionExpirationDate as string | null) ??
              (gym.planValidUntil as string | null) ??
              null,
            remainingDays: planDaysLeft,
          };
        },
      );

      set({ gyms, loading: false, error: null });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      set({
        loading: false,
        error: err.response?.data?.message || "Failed to load gyms.",
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("Failed to delete gym:", error);
      set({
        error: err.response?.data?.message || "Failed to delete gym.",
      });
      return false;
    }
  },
}));
