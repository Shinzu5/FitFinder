"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

const DEFAULT_GYMS: AdminActiveGym[] = [
  {
    id: "gym-1",
    name: "Abbsy Mini Gym",
    location: "Datag Buagsong, Cordova",
    imageUrl:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    members: 142,
    activeSubscriptions: 113,
    status: "active",
    ownerName: "Renz",
    ownerEmail: "renz@example.com",
    ownerInitials: "R",
    planLabel: "Pro Plan",
    paymentConfigured: true,
  },
  {
    id: "gym-powerhouse",
    name: "Powerhouse Fitness",
    location: "Downtown Metro",
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    members: 342,
    activeSubscriptions: 298,
    status: "active",
    ownerName: "Liza Gomez",
    ownerEmail: "liza@powerhouse.fit",
    ownerInitials: "LG",
    planLabel: "Standard plan",
    paymentConfigured: true,
  },
  {
    id: "gym-3",
    name: "The Iron Den",
    location: "Cebu City, Cebu",
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    members: 87,
    activeSubscriptions: 72,
    status: "active",
    ownerName: "Marcus Lee",
    ownerEmail: "marcus@ironden.fit",
    ownerInitials: "ML",
    planLabel: "Standard plan",
    paymentConfigured: true,
  },
  {
    id: "gym-4",
    name: "The Zone Fitness",
    location: "Lapu-Lapu City, Cebu",
    imageUrl:
      "https://images.unsplash.com/photo-1540497077202-7bf8a76381cd?auto=format&fit=crop&w=1200&q=80",
    members: 203,
    activeSubscriptions: 176,
    status: "active",
    ownerName: "Carla Mendoza",
    ownerEmail: "carla@thezone.fit",
    ownerInitials: "CM",
    planLabel: "Pro Plan",
    paymentConfigured: false,
  },
];

interface AdminGymsState {
  gyms: AdminActiveGym[];
  deleteGym: (id: string) => void;
  addGym: (gym: AdminActiveGym) => void;
}

export const useAdminGymsStore = create<AdminGymsState>()(
  persist(
    (set, get) => ({
      gyms: DEFAULT_GYMS,

      deleteGym: (id) => {
        set({ gyms: get().gyms.filter((gym) => gym.id !== id) });
      },

      addGym: (gym) => {
        if (get().gyms.some((item) => item.id === gym.id)) return;
        set({ gyms: [gym, ...get().gyms] });
      },
    }),
    {
      name: "fitfinder-admin-gyms",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
