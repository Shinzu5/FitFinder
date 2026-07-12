"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";

export function AdminSettingsPanel() {
  const platformName = useAdminSettingsStore((state) => state.platformName);
  const supportEmail = useAdminSettingsStore((state) => state.supportEmail);
  const maintenanceMode = useAdminSettingsStore((state) => state.maintenanceMode);
  const saveGeneralSettings = useAdminSettingsStore((state) => state.saveGeneralSettings);
  const toggleMaintenanceMode = useAdminSettingsStore((state) => state.toggleMaintenanceMode);

  const [name, setName] = useState(platformName);
  const [email, setEmail] = useState(supportEmail);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(platformName);
    setEmail(supportEmail);
  }, [platformName, supportEmail]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    saveGeneralSettings(name, email);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-6">
        <h2 className="text-lg font-bold text-white">General Settings</h2>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="platformName" className="text-zinc-400">
              Platform Name
            </Label>
            <Input
              id="platformName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-zinc-800/80 bg-[#131315] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail" className="text-zinc-400">
              Support Email
            </Label>
            <Input
              id="supportEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-zinc-800/80 bg-[#131315] text-white"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
            >
              Save Changes
            </button>
            {saved ? (
              <span className="text-sm text-emerald-400">Settings saved.</span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-6">
        <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Maintenance mode disables access for all users except administrators.
        </p>

        <button
          type="button"
          onClick={toggleMaintenanceMode}
          className={`mt-5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
            maintenanceMode
              ? "border-red-500/60 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              : "border-red-500/50 text-red-400 hover:bg-red-500/10"
          }`}
        >
          {maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
        </button>

        {maintenanceMode ? (
          <p className="mt-3 text-xs font-medium text-red-400/90">
            Maintenance mode is currently active.
          </p>
        ) : null}
      </section>
    </div>
  );
}
