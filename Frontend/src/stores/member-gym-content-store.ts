"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { GymExercise, ExerciseMediaType } from "@/stores/owner-exercises-store";
import type { EquipmentStatus, GymEquipment } from "@/stores/owner-equipment-store";

function mapExercise(raw: any): GymExercise {
  return {
    id: raw.id,
    name: raw.name,
    muscle: raw.muscle,
    category: raw.category || raw.muscle || "",
    difficulty: raw.difficulty || "Beginner",
    sets: raw.sets || "3",
    reps: raw.reps || "8-12",
    rest: raw.rest || "60s",
    targetMuscles: raw.targetMuscles || raw.muscle || "",
    formTips: raw.formTips || "",
    mediaUrl: raw.mediaUrl ? resolveMediaUrl(raw.mediaUrl) : null,
    mediaType: (raw.mediaType as ExerciseMediaType) || null,
    mediaName: raw.mediaName || null,
    cardImageUrl: resolveMediaUrl(
      raw.cardImageUrl || (raw.mediaType === "image" ? raw.mediaUrl : ""),
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    ),
  };
}

function normalizeStatus(status: string | undefined): EquipmentStatus {
  const value = (status || "available").toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "in_use") return "in_use";
  if (value === "under_maintenance" || value === "unavailable") return "under_maintenance";
  return "available";
}

interface MemberGymContentState {
  exercises: GymExercise[];
  equipment: GymEquipment[];
  loadingExercises: boolean;
  loadingEquipment: boolean;
  exercisesError: string | null;
  equipmentError: string | null;
  fetchExercises: () => Promise<void>;
  fetchEquipment: () => Promise<void>;
  clear: () => void;
}

/** Member-scoped gym content — never shares owner localStorage. */
export const useMemberGymContentStore = create<MemberGymContentState>((set) => ({
  exercises: [],
  equipment: [],
  loadingExercises: false,
  loadingEquipment: false,
  exercisesError: null,
  equipmentError: null,

  fetchExercises: async () => {
    set({ loadingExercises: true, exercisesError: null });
    try {
      const { data } = await api.get("/user/exercises");
      if (data.success) {
        set({ exercises: (data.data || []).map(mapExercise), loadingExercises: false });
        return;
      }
      set({
        exercises: [],
        loadingExercises: false,
        exercisesError: data.message || "Failed to load exercises.",
      });
    } catch (error: any) {
      set({
        exercises: [],
        loadingExercises: false,
        exercisesError:
          error.response?.data?.message || "Active membership required to view exercises.",
      });
    }
  },

  fetchEquipment: async () => {
    set({ loadingEquipment: true, equipmentError: null });
    try {
      const { data } = await api.get("/user/equipment");
      if (data.success) {
        set({
          equipment: (data.data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity ?? 1,
            status: normalizeStatus(item.status),
          })),
          loadingEquipment: false,
        });
        return;
      }
      set({
        equipment: [],
        loadingEquipment: false,
        equipmentError: data.message || "Failed to load equipment.",
      });
    } catch (error: any) {
      set({
        equipment: [],
        loadingEquipment: false,
        equipmentError:
          error.response?.data?.message || "Active membership required to view equipment.",
      });
    }
  },

  clear: () =>
    set({
      exercises: [],
      equipment: [],
      exercisesError: null,
      equipmentError: null,
    }),
}));
