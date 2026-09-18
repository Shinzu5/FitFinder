"use client";

import { create } from "zustand";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { GymExercise, ExerciseMediaType } from "@/stores/owner-exercises-store";
import type { EquipmentStatus, GymEquipment } from "@/stores/owner-equipment-store";
import type { ShopProduct } from "@/stores/owner-shop-store";

function mapExercise(raw: Record<string, unknown>): GymExercise {
  const mediaUrlStr = raw.mediaUrl ? String(raw.mediaUrl) : "";
  const cardImgStr = raw.cardImageUrl ? String(raw.cardImageUrl) : "";
  return {
    id: String(raw.id || ""),
    name: String(raw.name || ""),
    muscle: String(raw.muscle || ""),
    category: String(raw.category || raw.muscle || ""),
    difficulty: (raw.difficulty as GymExercise["difficulty"]) || "Beginner",
    sets: String(raw.sets || "3"),
    reps: String(raw.reps || "8-12"),
    rest: String(raw.rest || "60s"),
    targetMuscles: String(raw.targetMuscles || raw.muscle || ""),
    formTips: String(raw.formTips || ""),
    mediaUrl: mediaUrlStr ? resolveMediaUrl(mediaUrlStr) : null,
    mediaType: (raw.mediaType as ExerciseMediaType) || null,
    mediaName: raw.mediaName ? String(raw.mediaName) : null,
    cardImageUrl: resolveMediaUrl(
      cardImgStr || (raw.mediaType === "image" ? mediaUrlStr : ""),
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

function mapEquipment(item: Record<string, unknown>): GymEquipment {
  const rawImage = String(item.imageUrl || "").trim();
  return {
    id: String(item.id || ""),
    name: String(item.name || ""),
    quantity: Number(item.quantity) || 1,
    status: normalizeStatus(item.status ? String(item.status) : undefined),
    // Keep empty so equipment table can fall back to icon (not a blank <img>)
    imageUrl: rawImage ? resolveMediaUrl(rawImage) : "",
    imageName: item.imageName ? String(item.imageName) : null,
  };
}

function mapShopProduct(raw: Record<string, unknown>): ShopProduct {
  return {
    id: String(raw.id || ""),
    name: String(raw.name || ""),
    price: Number(raw.price) || 0,
    imageUrl: resolveMediaUrl(String(raw.imageUrl || "")),
    imageName: raw.imageName ? String(raw.imageName) : null,
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
    } catch (error: unknown) {
      set({
        exercises: [],
        loadingExercises: false,
        exercisesError:
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Active membership required to view exercises.",
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
    } catch (error: unknown) {
      set({
        equipment: [],
        loadingEquipment: false,
        equipmentError:
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Active membership required to view equipment.",
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
    } catch (error: unknown) {
      set({
        products: [],
        loadingShop: false,
        shopError:
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Active membership required to view the shop.",
      });
    }
  },

  setEquipmentFromRealtime: (items) => {
    if (!Array.isArray(items)) return;
    set({
      equipment: items.map((item) => mapEquipment(item as Record<string, unknown>)),
      equipmentError: null,
      loadingEquipment: false,
    });
  },

  setShopFromRealtime: (items) => {
    if (!Array.isArray(items)) return;
    set({
      products: items.map((item) => mapShopProduct(item as Record<string, unknown>)),
      shopError: null,
      loadingShop: false,
    });
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
