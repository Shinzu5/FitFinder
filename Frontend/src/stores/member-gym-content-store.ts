"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { GymExercise, ExerciseMediaType } from "@/stores/owner-exercises-store";
import type { EquipmentStatus, GymEquipment } from "@/stores/owner-equipment-store";
import type { ShopProduct } from "@/stores/owner-shop-store";

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

function mapEquipment(item: any): GymEquipment {
  const rawImage = String(item.imageUrl || "").trim();
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity ?? 1,
    status: normalizeStatus(item.status),
    // Keep empty so equipment table can fall back to icon (not a blank <img>)
    imageUrl: rawImage ? resolveMediaUrl(rawImage) : "",
    imageName: item.imageName || null,
  };
}

function mapShopProduct(raw: any): ShopProduct {
  return {
    id: raw.id,
    name: raw.name,
    price: Number(raw.price) || 0,
    imageUrl: resolveMediaUrl(raw.imageUrl),
    imageName: raw.imageName || null,
  };
}

interface MemberGymContentState {
  exercises: GymExercise[];
  equipment: GymEquipment[];
  products: ShopProduct[];
  loadingExercises: boolean;
  loadingEquipment: boolean;
  loadingShop: boolean;
  exercisesError: string | null;
  equipmentError: string | null;
  shopError: string | null;
  fetchExercises: () => Promise<void>;
  fetchEquipment: () => Promise<void>;
  fetchShop: () => Promise<void>;
  setEquipmentFromRealtime: (items: unknown[]) => void;
  setShopFromRealtime: (items: unknown[]) => void;
  clear: () => void;
}

/** Member-scoped gym content — Neon only, never Owner localStorage. */
export const useMemberGymContentStore = create<MemberGymContentState>((set) => ({
  exercises: [],
  equipment: [],
  products: [],
  loadingExercises: false,
  loadingEquipment: false,
  loadingShop: false,
  exercisesError: null,
  equipmentError: null,
  shopError: null,

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
          equipment: (data.data || []).map(mapEquipment),
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

  fetchShop: async () => {
    set({ loadingShop: true, shopError: null });
    try {
      const { data } = await api.get("/user/shop");
      if (data.success) {
        set({
          products: (data.data || []).map(mapShopProduct),
          loadingShop: false,
        });
        return;
      }
      set({
        products: [],
        loadingShop: false,
        shopError: data.message || "Failed to load shop products.",
      });
    } catch (error: any) {
      set({
        products: [],
        loadingShop: false,
        shopError:
          error.response?.data?.message || "Active membership required to view the shop.",
      });
    }
  },

  setEquipmentFromRealtime: (items) => {
    if (!Array.isArray(items)) return;
    set({ equipment: items.map(mapEquipment), equipmentError: null, loadingEquipment: false });
  },

  setShopFromRealtime: (items) => {
    if (!Array.isArray(items)) return;
    set({ products: items.map(mapShopProduct), shopError: null, loadingShop: false });
  },

  clear: () =>
    set({
      exercises: [],
      equipment: [],
      products: [],
      exercisesError: null,
      equipmentError: null,
      shopError: null,
    }),
}));
