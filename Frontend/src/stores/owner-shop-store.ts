"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "@/lib/api";

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  imageName: string | null;
}

export type ShopProductInput = Omit<ShopProduct, "id">;

interface OwnerShopState {
  products: ShopProduct[];
  loading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (product: ShopProductInput) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
}

export const useOwnerShopStore = create<OwnerShopState>()(
  persist(
    (set, get) => ({
      products: [],
      loading: false,

      fetchProducts: async () => {
        set({ loading: true });
        try {
          const { data } = await api.get("/owner/shop");
          if (data.success) {
            set({ products: data.data, loading: false });
            return;
          }
        } catch (error) {
          console.error("Failed to fetch products:", error);
        }
        set({ loading: false });
      },

      addProduct: async (product) => {
        try {
          const { data } = await api.post("/owner/shop", product);
          if (data.success) {
            set({ products: [...get().products, data.data] });
            return;
          }
        } catch (error) {
          console.error("Failed to add product:", error);
        }
        set({
          products: [
            ...get().products,
            {
              id: `product-${Date.now()}`,
              name: product.name.trim(),
              price: product.price,
              imageUrl: product.imageUrl,
              imageName: product.imageName,
            },
          ],
        });
      },

      removeProduct: async (id) => {
        try {
          await api.delete(`/owner/shop/${id}`);
        } catch (error) {
          console.error("Failed to remove product:", error);
        }
        set({ products: get().products.filter((p) => p.id !== id) });
      },
    }),
    {
      name: "fitfinder-owner-shop",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function formatProductPrice(price: number) {
  return `₱${price.toLocaleString()}`;
}
