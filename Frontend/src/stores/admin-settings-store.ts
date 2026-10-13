"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const DEFAULT_SETTINGS = {
  platformName: "Fit Finder",
  supportEmail: "Fitfinder@gmail.com",
};

interface AdminSettingsState {
  platformName: string;
  supportEmail: string;
  saveGeneralSettings: (platformName: string, supportEmail: string) => void;
}

export const useAdminSettingsStore = create<AdminSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      saveGeneralSettings: (platformName, supportEmail) => {
        set({ platformName: platformName.trim(), supportEmail: supportEmail.trim() });
      },
    }),
    {
      name: "fitfinder-admin-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
