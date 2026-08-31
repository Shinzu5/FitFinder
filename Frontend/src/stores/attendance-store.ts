"use client";

import { create } from "zustand";
import api from "@/lib/api";

export interface AttendanceRow {
  id: string;
  gymId: string;
  userId: string | null;
  memberName: string;
  type: string;
  paymentAmount: number;
  checkedInAt: string;
  checkedOutAt: string | null;
  checkedInById: string | null;
  isCheckedIn: boolean;
}

export interface AttendanceMember {
  id: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  plan: string;
  status: string;
  checkedIn: boolean;
  openAttendanceId: string | null;
}

interface AttendanceState {
  gymId: string;
  gymName: string;
  activeNow: number;
  open: AttendanceRow[];
  today: AttendanceRow[];
  members: AttendanceMember[];
  loading: boolean;
  error: string | null;
  fetchAttendance: (opts?: { silent?: boolean }) => Promise<void>;
  setActiveNow: (n: number) => void;
  checkInMember: (userId: string) => Promise<boolean>;
  checkOut: (attendanceId: string) => Promise<boolean>;
  checkInWalkIn: (name: string, paymentAmount: number) => Promise<boolean>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  gymId: "",
  gymName: "",
  activeNow: 0,
  open: [],
  today: [],
  members: [],
  loading: false,
  error: null,

  fetchAttendance: async (opts) => {
    const silent = Boolean(opts?.silent);
    if (!silent) set({ loading: true });
    try {
      const { data } = await api.get("/clerk/attendance");
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load attendance." });
        return;
      }
      const payload = data.data || {};
      set({
        gymId: payload.gymId || "",
        gymName: payload.gymName || "",
        activeNow: Number(payload.activeNow) || 0,
        open: Array.isArray(payload.open) ? payload.open : [],
        today: Array.isArray(payload.today) ? payload.today : [],
        members: Array.isArray(payload.members) ? payload.members : [],
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to load attendance.";
      set({ loading: false, error: message });
    }
  },

  setActiveNow: (n) => set({ activeNow: Math.max(0, Number(n) || 0) }),

  checkInMember: async (userId) => {
    try {
      const { data } = await api.post("/clerk/attendance/check-in", { userId });
      if (!data.success) {
        set({ error: data.message || "Check-in failed." });
        return false;
      }
      if (typeof data.data?.activeNow === "number") {
        set({ activeNow: data.data.activeNow });
      }
      await get().fetchAttendance({ silent: true });
      return true;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Check-in failed.";
      set({ error: message });
      return false;
    }
  },

  checkOut: async (attendanceId) => {
    try {
      const { data } = await api.post(`/clerk/attendance/${attendanceId}/check-out`);
      if (!data.success) {
        set({ error: data.message || "Check-out failed." });
        return false;
      }
      if (typeof data.data?.activeNow === "number") {
        set({ activeNow: data.data.activeNow });
      }
      await get().fetchAttendance({ silent: true });
      return true;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Check-out failed.";
      set({ error: message });
      return false;
    }
  },

  checkInWalkIn: async (name, paymentAmount) => {
    try {
      const { data } = await api.post("/clerk/attendance/walk-in", {
        name,
        paymentAmount,
      });
      if (!data.success) {
        set({ error: data.message || "Walk-in check-in failed." });
        return false;
      }
      if (typeof data.data?.activeNow === "number") {
        set({ activeNow: data.data.activeNow });
      }
      await get().fetchAttendance({ silent: true });
      return true;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Walk-in check-in failed.";
      set({ error: message });
      return false;
    }
  },
}));
