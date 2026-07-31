"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Search, Trash2 } from "lucide-react";
import { useAdminStore } from "@/stores/admin-store";
import { type AdminActiveGym, useAdminGymsStore } from "@/stores/admin-gyms-store";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { resolveMediaUrl } from "@/lib/media";
import { AdminDeleteGymModal } from "./AdminDeleteGymModal";
import { AdminGymViewModal } from "./AdminGymViewModal";

export function AdminGymsPanel() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const gyms = useAdminGymsStore((state) => state.gyms);
  const loading = useAdminGymsStore((state) => state.loading);
  const error = useAdminGymsStore((state) => state.error);
  const fetchGyms = useAdminGymsStore((state) => state.fetchGyms);
  const deleteGym = useAdminGymsStore((state) => state.deleteGym);
  const addActivity = useAdminStore((state) => state.addActivity);

  const [search, setSearch] = useState("");
  const [viewGym, setViewGym] = useState<AdminActiveGym | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminActiveGym | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    void fetchGyms();
    const onFocus = () => void fetchGyms({ silent: true });
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void fetchGyms({ silent: true }), 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [fetchGyms]);

  // Live updates when any owner buys a plan / gym is created / members join
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    const onUpdated = () => {
      void fetchGyms({ silent: true });
    };
    socket.on("admin_gyms_updated", onUpdated);
    return () => {
      socket.off("admin_gyms_updated", onUpdated);
    };
  }, [accessToken, fetchGyms]);

  const filteredGyms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return gyms;
    return gyms.filter(
      (gym) =>
        gym.name.toLowerCase().includes(query) || gym.location.toLowerCase().includes(query),
    );
  }, [gyms, search]);

  async function handleConfirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const ok = await deleteGym(deleteTarget.id);
    setDeleting(false);
    if (!ok) {
      setDeleteError(
        useAdminGymsStore.getState().error || "Failed to delete gym. Try again.",
      );
      return;
    }
    addActivity(`${deleteTarget.name} removed from platform`, "warning");
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-white">Active Gyms</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gyms..."
              className="w-full rounded-xl border border-zinc-800/80 bg-[#131315] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#FACC15]/40"
            />
          </div>
        </div>

        {deleteError || error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {deleteError || error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-4">Gym Name</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Members</th>
                  <th className="px-5 py-4">Owner Plan</th>
                  <th className="px-5 py-4">Days Left</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && gyms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                      Loading gyms…
                    </td>
                  </tr>
                ) : filteredGyms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                      No active gyms found.
                    </td>
                  </tr>
                ) : (
                  filteredGyms.map((gym) => (
                    <tr key={gym.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveMediaUrl(gym.imageUrl)}
                              alt={gym.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="font-semibold text-white">{gym.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{gym.location}</td>
                      <td className="px-5 py-4 font-medium text-white">{gym.members}</td>
                      <td className="px-5 py-4 text-zinc-300">
                        {gym.planLabel !== "No plan" ? (
                          <span>
                            {gym.planLabel}
                            {typeof gym.planPrice === "number" ? (
                              <span className="block text-xs text-zinc-400">
                                ₱{gym.planPrice.toLocaleString("en-PH")}
                              </span>
                            ) : null}
                            {gym.planMonths ? (
                              <span className="block text-xs text-zinc-500">
                                {gym.planMonths} day{gym.planMonths === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {gym.planDaysLeft === null ? (
                          <span className="text-zinc-500">—</span>
                        ) : gym.planExpired || gym.planDaysLeft === 0 ? (
                          <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                            Expired
                          </span>
                        ) : gym.planDaysLeft <= 7 ? (
                          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                            {gym.planDaysLeft} day{gym.planDaysLeft === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="font-semibold text-[#FACC15]">
                            {gym.planDaysLeft} days
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {gym.status === "active" ? (
                          <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                            Active
                          </span>
                        ) : gym.status === "expired" ? (
                          <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewGym(gym)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FACC15]/50 px-3 py-1.5 text-xs font-semibold text-[#FACC15] transition hover:bg-[#FACC15]/10"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(gym)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AdminGymViewModal gym={viewGym} onClose={() => setViewGym(null)} />
      <AdminDeleteGymModal
        open={Boolean(deleteTarget)}
        gymName={deleteTarget?.name ?? ""}
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
