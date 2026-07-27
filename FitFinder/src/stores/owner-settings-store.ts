"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface OwnerSettingsState {
  xenditApiKey: string | null;
  connectionTested: boolean;
  saveApiKey: (key: string) => void;
  clearApiKey: () => void;
  setConnectionTested: (value: boolean) => void;
}

export const useOwnerSettingsStore = create<OwnerSettingsState>()(
  persist(
    (set) => ({
      xenditApiKey: null,
      connectionTested: false,
      saveApiKey: (key) => set({ xenditApiKey: key, connectionTested: false }),
      clearApiKey: () => set({ xenditApiKey: null, connectionTested: false }),
      setConnectionTested: (value) => set({ connectionTested: value }),
    }),
    {
      name: "fitfinder-owner-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function maskApiKey(key: string) {
  if (key.length <= 16) return key;
  return `${key.slice(0, 12)}${"•".repeat(Math.min(key.length - 16, 20))}${key.slice(-4)}`;
}

export function isValidXenditKey(key: string) {
  return (
    key.startsWith("xnd_production_") || key.startsWith("xnd_development_")
  );
}
