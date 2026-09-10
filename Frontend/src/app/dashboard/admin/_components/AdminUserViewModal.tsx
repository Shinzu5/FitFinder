"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { PlatformUser } from "@/stores/admin-users-store";

interface UserGymRow {
  gymId: string;
  gymName: string;
  planName: string;
  planType: string;
  remainingDays: number | null;
  status: "Pending" | "Active" | "Expired" | "Cancelled";
  source: string;
  joinedAt: string | null;
  expiresAt: string | null;
}

interface AdminUserViewModalProps {
  user: PlatformUser | null;
  onClose: () => void;
}

function statusStyles(status: UserGymRow["status"]) {
  if (status === "Active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "Pending") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
  if (status === "Cancelled") {
    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
  }
  return "border-red-500/30 bg-red-500/10 text-red-400";
}

export function AdminUserViewModal({ user, onClose }: AdminUserViewModalProps) {
  const [gyms, setGyms] = useState<UserGymRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data } = await api.get(`/admin/users/${user.id}`);
        if (cancelled) return;
        if (!data.success) {
          setError(data.message || "Failed to load user details.");
          setGyms([]);
        } else {
          setGyms(Array.isArray(data.data?.gyms) ? data.data.gyms : []);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load user details.");
          setGyms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close user details"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800/70 bg-[#0e0e10] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 px-5 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                resolveMediaUrl(user.avatarUrl) ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || "U")}&background=FACC15&color=000000&bold=true`
              }
              alt={user.fullName}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-bold text-white">{user.fullName}</h2>
              <p className="text-sm text-zinc-500">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Gym Memberships
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            All gyms this user is or was registered with (from Neon).
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800/70">
            <table className="w-full min-w-160 text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Gym</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Plan Type</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-red-400">
                      {error}
                    </td>
                  </tr>
                ) : gyms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                      No gym registrations found.
                    </td>
                  </tr>
                ) : (
                  gyms.map((row, idx) => (
                    <tr
                      key={`${row.gymId}-${row.status}-${row.source}-${idx}`}
                      className="border-b border-zinc-800/50 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-white">{row.gymName}</td>
                      <td className="px-4 py-3 text-zinc-300">{row.planName}</td>
                      <td className="px-4 py-3 text-zinc-400">{row.planType}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {row.remainingDays == null
                          ? "—"
                          : `${row.remainingDays} day${row.remainingDays === 1 ? "" : "s"}`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusStyles(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
