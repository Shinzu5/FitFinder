"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const DEFAULT_SETTINGS = {
  platformName: "Fit Finder",
  supportEmail: "Fitfinder@gmail.com",
  maintenanceMode: false,
};

interface AdminSettingsState {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  saveGeneralSettings: (platformName: string, supportEmail: string) => void;
  toggleMaintenanceMode: () => void;
}

export const useAdminSettingsStore = create<AdminSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      saveGeneralSettings: (platformName, supportEmail) => {
        set({ platformName: platformName.trim(), supportEmail: supportEmail.trim() });
      },

      toggleMaintenanceMode: () => {
        set({ maintenanceMode: !get().maintenanceMode });
      },
    }),
    {
      name: "fitfinder-admin-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
