"use client";

import { create } from "zustand";
import api from "@/lib/api";

interface OwnerPaymentSettingsState {
  hasApiKey: boolean;
  maskedApiKey: string | null;
  xenditEnabled: boolean;
  cashlessEnabled: boolean;
  loading: boolean;
  /** Local draft while typing a new key (not persisted) */
  draftApiKey: string;
  connectionTested: boolean;
  fetchSettings: () => Promise<void>;
  setDraftApiKey: (key: string) => void;
  saveApiKey: (key: string) => Promise<boolean>;
  clearApiKey: () => Promise<boolean>;
  setXenditEnabled: (enabled: boolean) => Promise<boolean>;
  setConnectionTested: (value: boolean) => void;
}

export const useOwnerSettingsStore = create<OwnerPaymentSettingsState>((set) => ({
  hasApiKey: false,
  maskedApiKey: null,
  xenditEnabled: false,
  cashlessEnabled: false,
  loading: false,
  draftApiKey: "",
  connectionTested: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/owner/payment-settings");
      if (data.success && data.data) {
        set({
          hasApiKey: Boolean(data.data.hasApiKey),
          maskedApiKey: data.data.maskedApiKey ?? null,
          xenditEnabled: Boolean(data.data.xenditEnabled),
          cashlessEnabled: Boolean(data.data.cashlessEnabled),
          draftApiKey: "",
        });
      }
    } catch {
      /* keep prior state */
    } finally {
      set({ loading: false });
    }
  },

  setDraftApiKey: (key) => set({ draftApiKey: key, connectionTested: false }),

  saveApiKey: async (key) => {
    try {
      const { data } = await api.put("/owner/payment-settings", {
        xenditApiKey: key,
        xenditEnabled: true,
      });
      if (!data.success) return false;
      set({
        hasApiKey: Boolean(data.data.hasApiKey),
        maskedApiKey: data.data.maskedApiKey ?? null,
        xenditEnabled: Boolean(data.data.xenditEnabled),
        cashlessEnabled: Boolean(data.data.cashlessEnabled),
        draftApiKey: "",
        connectionTested: false,
      });
      return true;
    } catch {
      return false;
    }
  },

  clearApiKey: async () => {
    try {
      const { data } = await api.put("/owner/payment-settings", { clearApiKey: true });
      if (!data.success) return false;
      set({
        hasApiKey: false,
        maskedApiKey: null,
        xenditEnabled: false,
        cashlessEnabled: false,
        draftApiKey: "",
        connectionTested: false,
      });
      return true;
    } catch {
      return false;
    }
  },

  setXenditEnabled: async (enabled) => {
    try {
      const { data } = await api.put("/owner/payment-settings", {
        xenditEnabled: enabled,
      });
      if (!data.success) return false;
      set({
        hasApiKey: Boolean(data.data.hasApiKey),
        maskedApiKey: data.data.maskedApiKey ?? null,
        xenditEnabled: Boolean(data.data.xenditEnabled),
        cashlessEnabled: Boolean(data.data.cashlessEnabled),
      });
      return true;
    } catch {
      return false;
    }
  },

  setConnectionTested: (value) => set({ connectionTested: value }),
}));

export function maskApiKey(key: string) {
  if (key.length <= 16) return key;
  return `${key.slice(0, 12)}${"•".repeat(Math.min(key.length - 16, 20))}${key.slice(-4)}`;
}

export function isValidXenditKey(key: string) {
  return (
    key.startsWith("xnd_production_") || key.startsWith("xnd_development_")
  );
}
