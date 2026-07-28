"use client";

import { useMemo, useState } from "react";
import { Eye, Search, Trash2 } from "lucide-react";
import { useAdminStore } from "@/stores/admin-store";
import { type AdminActiveGym, useAdminGymsStore } from "@/stores/admin-gyms-store";
import { AdminDeleteGymModal } from "./AdminDeleteGymModal";
import { AdminGymViewModal } from "./AdminGymViewModal";

export function AdminGymsPanel() {
  const gyms = useAdminGymsStore((state) => state.gyms);
  const deleteGym = useAdminGymsStore((state) => state.deleteGym);
  const addActivity = useAdminStore((state) => state.addActivity);

  const [search, setSearch] = useState("");
  const [viewGym, setViewGym] = useState<AdminActiveGym | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminActiveGym | null>(null);

  const filteredGyms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return gyms;
    return gyms.filter(
      (gym) =>
        gym.name.toLowerCase().includes(query) || gym.location.toLowerCase().includes(query),
    );
  }, [gyms, search]);

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteGym(deleteTarget.id);
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

        <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-4">Gym Name</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Members</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGyms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                      No gyms found.
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
                              src={gym.imageUrl}
                              alt={gym.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="font-semibold text-white">{gym.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{gym.location}</td>
                      <td className="px-5 py-4 font-medium text-white">{gym.members}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                          Active
                        </span>
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
        gymName={deleteTarget?.name ?? "this gym"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
