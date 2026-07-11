"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  imageName: string | null;
}

export type ShopProductInput = Omit<ShopProduct, "id">;

const DEFAULT_PRODUCTS: ShopProduct[] = [
  {
    id: "product-1",
    name: "Whey Protein Isolate",
    price: 2500,
    imageUrl:
      "https://images.unsplash.com/photo-1593095948071-95c0516bc6f5?auto=format&fit=crop&w=600&q=80",
    imageName: null,
  },
  {
    id: "product-2",
    name: "GymOS Shaker Bottle",
    price: 450,
    imageUrl:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
    imageName: null,
  },
];

interface OwnerShopState {
  products: ShopProduct[];
  addProduct: (product: ShopProductInput) => void;
  removeProduct: (id: string) => void;
}

export const useOwnerShopStore = create<OwnerShopState>()(
  persist(
    (set, get) => ({
      products: DEFAULT_PRODUCTS,

      addProduct: (product) => {
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

      removeProduct: (id) => {
        set({ products: get().products.filter((product) => product.id !== id) });
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
