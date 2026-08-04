"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import {
  type AdminUserTab,
  type PlatformUser,
  formatJoinedDate,
  getPlatformUserStatusStyles,
  useAdminUsersStore,
} from "@/stores/admin-users-store";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { AdminRemoveUserModal } from "./AdminRemoveUserModal";
import { AdminUserViewModal } from "./AdminUserViewModal";
import { resolveMediaUrl } from "@/lib/media";

const TABS: { id: AdminUserTab; label: string }[] = [
  { id: "users", label: "users" },
  { id: "owner", label: "owner" },
  { id: "clerk", label: "clerk" },
];

export function AdminUsersPanel() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const users = useAdminUsersStore((state) => state.users);
  const fetchUsers = useAdminUsersStore((state) => state.fetchUsers);
  const removeUser = useAdminUsersStore((state) => state.removeUser);
  const addActivity = useAdminStore((state) => state.addActivity);

  const [activeTab, setActiveTab] = useState<AdminUserTab>("users");
  const [viewTarget, setViewTarget] = useState<PlatformUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PlatformUser | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isClerkTab = activeTab === "clerk";

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const onRealtime = useCallback(() => {
    void fetchUsers({ silent: true });
  }, [fetchUsers]);

  // Live updates when someone registers / verifies / role changes / is removed
  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket(accessToken);
    socket.on("admin_users_updated", onRealtime);
    return () => {
      socket.off("admin_users_updated", onRealtime);
    };
  }, [accessToken, onRealtime]);

  const filteredUsers = useMemo(
    () => users.filter((user) => user.tab === activeTab),
    [users, activeTab],
  );

  async function handleConfirmRemove() {
    if (!removeTarget || removeBusy || removeTarget.tab === "clerk") return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await removeUser(removeTarget.id);
      addActivity(`${removeTarget.fullName} removed from platform`, "warning");
      setRemoveTarget(null);
    } catch (error: unknown) {
      setRemoveError(
        (error as { message?: string })?.message || "Failed to remove this user.",
      );
    } finally {
      setRemoveBusy(false);
    }
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
                  {isClerkTab ? <th className="px-5 py-4">Gym</th> : null}
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isClerkTab ? 5 : 5}
                      className="px-5 py-12 text-center text-zinc-500"
                    >
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
                            src={
                              resolveMediaUrl(user.avatarUrl) ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || "U")}&background=FACC15&color=000000&bold=true`
                            }
                            alt={user.fullName}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-semibold text-white">{user.fullName}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {isClerkTab ? (
                        <td className="px-5 py-4">
                          {user.gymName ? (
                            <div>
                              <p className="font-medium text-white">{user.gymName}</p>
                              {user.gymOwnerName ? (
                                <p className="text-xs text-zinc-500">
                                  Owner: {user.gymOwnerName}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-zinc-500">Unassigned</span>
                          )}
                        </td>
                      ) : null}
                      <td className="px-5 py-4 text-zinc-400">
                        {formatJoinedDate(user.joinedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getPlatformUserStatusStyles(user.status)}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setViewTarget(user)}
                            className="rounded-lg border border-[#FACC15]/40 px-4 py-1.5 text-xs font-semibold text-[#FACC15] transition hover:bg-[#FACC15]/10"
                          >
                            View
                          </button>
                          {!isClerkTab ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveError(null);
                                setRemoveTarget(user);
                              }}
                              className="rounded-lg border border-red-500/50 px-4 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          ) : null}
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

      <AdminUserViewModal user={viewTarget} onClose={() => setViewTarget(null)} />

      <AdminRemoveUserModal
        open={Boolean(removeTarget) && removeTarget?.tab !== "clerk"}
        userName={removeTarget?.fullName ?? "this user"}
        roleLabel={removeTarget?.tab}
        busy={removeBusy}
        error={removeError}
        onClose={() => {
          if (removeBusy) return;
          setRemoveTarget(null);
          setRemoveError(null);
        }}
        onConfirm={() => void handleConfirmRemove()}
      />
    </>
  );
}
