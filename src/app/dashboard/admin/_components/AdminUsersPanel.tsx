"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import {
  type AdminUserTab,
  type PlatformUser,
  formatJoinedDate,
  useAdminUsersStore,
} from "@/stores/admin-users-store";
import { AdminRemoveUserModal } from "./AdminRemoveUserModal";

const TABS: { id: AdminUserTab; label: string }[] = [
  { id: "users", label: "users" },
  { id: "owner", label: "owner" },
  { id: "clerk", label: "clerk" },
];

export function AdminUsersPanel() {
  const users = useAdminUsersStore((state) => state.users);
  const removeUser = useAdminUsersStore((state) => state.removeUser);
  const addActivity = useAdminStore((state) => state.addActivity);

  const [activeTab, setActiveTab] = useState<AdminUserTab>("users");
  const [removeTarget, setRemoveTarget] = useState<PlatformUser | null>(null);

  const filteredUsers = useMemo(
    () => users.filter((user) => user.tab === activeTab),
    [users, activeTab],
  );

  function handleConfirmRemove() {
    if (!removeTarget) return;
    removeUser(removeTarget.id);
    addActivity(`${removeTarget.fullName} removed from platform`, "warning");
    setRemoveTarget(null);
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6">
        <h2 className="text-2xl font-bold text-white">User Management</h2>

        <div className="flex gap-6 border-b border-zinc-800/80">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-3 text-sm font-medium capitalize transition ${
                  active ? "text-[#FACC15]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#FACC15]" />
                ) : null}
              </button>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-[#131315] text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-zinc-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-semibold text-white">{user.fullName}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-zinc-400">
                        {formatJoinedDate(user.joinedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-emerald-400">
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(user)}
                          className="rounded-lg border border-red-500/50 px-4 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AdminRemoveUserModal
        open={Boolean(removeTarget)}
        userName={removeTarget?.fullName ?? "this user"}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
}
