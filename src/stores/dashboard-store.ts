import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GymStatus = "APPROVED" | "PENDING";

export interface Gym {
  id: string;
  slug: string;
  name: string;
  location: string;
  image: string;
  description: string;
  monthlyPrice: number;
  memberCount: number;
  status: GymStatus;
}

export interface DashboardNotification {
  id: string;
  title: string;
  detail: string;
  time: string;
}

export const mockGyms: Gym[] = [
  {
    id: "gym-1",
    slug: "fitforge-athletics",
    name: "FitForge Athletics",
    location: "Downtown Austin",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    description: "A performance-first training club built for strength-focused members.",
    monthlyPrice: 79,
    memberCount: 1820,
    status: "APPROVED",
  },
  {
    id: "gym-2",
    slug: "iron-peak-studio",
    name: "Iron Peak Studio",
    location: "Midtown Phoenix",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
    description: "Boutique coaching, recovery zones, and elite lifting programs.",
    monthlyPrice: 89,
    memberCount: 1240,
    status: "APPROVED",
  },
  {
    id: "gym-3",
    slug: "pulse-club-collective",
    name: "Pulse Club Collective",
    location: "Bayside Seattle",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    description: "A premium hybrid club with mobility, cardio, and coaching support.",
    monthlyPrice: 95,
    memberCount: 1380,
    status: "PENDING",
  },
  {
    id: "gym-4",
    slug: "northline-performance",
    name: "NorthLine Performance",
    location: "Riverside Denver",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    description: "A high-energy training gym for athletes and everyday movers.",
    monthlyPrice: 72,
    memberCount: 950,
    status: "APPROVED",
  },
  {
    id: "gym-5",
    slug: "summit-total-fitness",
    name: "Summit Total Fitness",
    location: "West End Chicago",
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80",
    description: "Full-service recovery, classes, and strength coaching in one place.",
    monthlyPrice: 84,
    memberCount: 2015,
    status: "APPROVED",
  },
  {
    id: "gym-6",
    slug: "luma-fitness-labs",
    name: "Luma Fitness Labs",
    location: "Harbor District Portland",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80",
    description: "Cutting-edge facility with scheduled coaching and smart equipment.",
    monthlyPrice: 88,
    memberCount: 1102,
    status: "PENDING",
  },
];

export const mockNotifications: DashboardNotification[] = [
  {
    id: "note-1",
    title: "Gym approval update",
    detail: "Your pending gym review is being checked by the admin team.",
    time: "2m ago",
  },
  {
    id: "note-2",
    title: "Community new member",
    detail: "Your recommended gyms were updated for the week.",
    time: "18m ago",
  },
  {
    id: "note-3",
    title: "Training tip",
    detail: "A new recovery plan has been suggested for your member journey.",
    time: "1h ago",
  },
];

interface DashboardState {
  gyms: Gym[];
  notifications: DashboardNotification[];
  hasMembership: boolean;
  refreshGyms: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      gyms: mockGyms,
      notifications: mockNotifications,
      hasMembership: false,
      refreshGyms: () => set({ gyms: mockGyms }),
    }),
    {
      name: "fitfinder-user-dashboard",
      partialize: (state) => ({
        gyms: state.gyms,
        notifications: state.notifications,
        hasMembership: state.hasMembership,
      }),
    },
  ),
);
