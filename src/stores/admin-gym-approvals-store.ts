"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

const DEFAULT_GYM_IMAGE =
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80";

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getTime();
}

function daysAgo(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function formatSubmittedDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

const DEFAULT_APPLICATIONS: GymApplication[] = [
  {
    id: "app-1",
    gymName: "Flex Fitness Studio",
    ownerName: "Alex Cruz",
    ownerEmail: "alex@flexfitness.com",
    contactNumber: "0917 123 4567",
    location: "Mandaue City, Cebu",
    imageUrl: DEFAULT_GYM_IMAGE,
    websiteSlug: "https://abbsy.gym",
    apiKey: "ffs_live_8f2a••••••••",
    planName: "Standard plan",
    planPrice: 699,
    submittedAt: makeDate(2026, 5, 26),
    status: "pending",
  },
  {
    id: "app-2",
    gymName: "Davao Strength Co.",
    ownerName: "Marco Santos",
    ownerEmail: "marco@email.com",
    contactNumber: "0918 234 5678",
    location: "Davao City",
    imageUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    websiteSlug: "https://davaostrength.fit",
    apiKey: "dsc_live_1b4c••••••••",
    planName: "Starter plan",
    planPrice: 299,
    submittedAt: daysAgo(1),
    status: "pending",
  },
  {
    id: "app-3",
    gymName: "Powerhouse Fitness",
    ownerName: "Liza Gomez",
    ownerEmail: "liza@email.com",
    contactNumber: "0919 345 6789",
    location: "Cebu City",
    imageUrl:
      "https://images.unsplash.com/photo-1540497077202-7bf8a76381cd?auto=format&fit=crop&w=1200&q=80",
    websiteSlug: "https://powerhouse.fit",
    apiKey: "phf_live_9d3e••••••••",
    planName: "Standard plan",
    planPrice: 699,
    submittedAt: daysAgo(3),
    status: "pending",
  },
  {
    id: "app-4",
    gymName: "Elite Fitness Cebu",
    ownerName: "Ryan Tan",
    ownerEmail: "ryan@email.com",
    contactNumber: "0920 456 7890",
    location: "Lapu-Lapu City",
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    websiteSlug: "https://elitefitcebu.com",
    apiKey: "efc_live_2a7f••••••••",
    planName: "Pro plan",
    planPrice: 1499,
    submittedAt: daysAgo(4),
    status: "pending",
  },
  {
    id: "app-5",
    gymName: "Northside Athletics",
    ownerName: "Paul Rivera",
    ownerEmail: "paul@email.com",
    contactNumber: "0921 567 8901",
    location: "Mandaue City",
    imageUrl:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
    websiteSlug: "https://northsideathletics.fit",
    apiKey: "nsa_live_4c1d••••••••",
    planName: "Standard plan",
    planPrice: 699,
    submittedAt: daysAgo(5),
    status: "pending",
  },
  {
    id: "app-6",
    gymName: "Pulse Gym Studio",
    ownerName: "Nina Lopez",
    ownerEmail: "nina@email.com",
    contactNumber: "0922 678 9012",
    location: "Cebu City",
    imageUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    websiteSlug: "https://pulsegym.studio",
    apiKey: "pgs_live_6e8b••••••••",
    planName: "Starter plan",
    planPrice: 299,
    submittedAt: daysAgo(6),
    status: "pending",
  },
  {
    id: "app-7",
    gymName: "Harbor Fit Club",
    ownerName: "Chris Yu",
    ownerEmail: "chris@email.com",
    contactNumber: "0923 789 0123",
    location: "Cebu City",
    imageUrl:
      "https://images.unsplash.com/photo-1540497077202-7bf8a76381cd?auto=format&fit=crop&w=1200&q=80",
    websiteSlug: "https://harborfit.club",
    apiKey: "hfc_live_3f9a••••••••",
    planName: "Standard plan",
    planPrice: 699,
    submittedAt: daysAgo(7),
    status: "pending",
  },
  {
    id: "app-8",
    gymName: "Summit Performance",
    ownerName: "Grace Lim",
    ownerEmail: "grace@email.com",
    contactNumber: "0924 890 1234",
    location: "Talisay City",
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    websiteSlug: "https://summitperformance.fit",
    apiKey: "spf_live_7b2c••••••••",
    planName: "Pro plan",
    planPrice: 1499,
    submittedAt: daysAgo(8),
    status: "pending",
  },
];

interface AdminGymApprovalsState {
  applications: GymApplication[];
  approveApplication: (id: string) => GymApplication | null;
  declineApplication: (id: string) => GymApplication | null;
  getPendingCount: () => number;
}

export const useAdminGymApprovalsStore = create<AdminGymApprovalsState>()(
  persist(
    (set, get) => ({
      applications: DEFAULT_APPLICATIONS,

      approveApplication: (id) => {
        const app = get().applications.find((item) => item.id === id);
        if (!app || app.status !== "pending") return null;

        const updated: GymApplication = {
          ...app,
          status: "approved",
          reviewedAt: Date.now(),
        };

        set({
          applications: get().applications.map((item) => (item.id === id ? updated : item)),
        });

        return updated;
      },

      declineApplication: (id) => {
        const app = get().applications.find((item) => item.id === id);
        if (!app || app.status !== "pending") return null;

        const updated: GymApplication = {
          ...app,
          status: "declined",
          reviewedAt: Date.now(),
        };

        set({
          applications: get().applications.map((item) => (item.id === id ? updated : item)),
        });

        return updated;
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
