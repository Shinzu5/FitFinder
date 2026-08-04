"use client";

import { useEffect, useMemo } from "react";
import { MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMembershipStore } from "@/stores/membership-store";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";
import { useAuthStore } from "@/stores/auth-store";
import { resolveGymAccessStatus } from "@/lib/gym-access";

interface EnrolledGymsModalProps {
  open: boolean;
  onClose: () => void;
}

export function EnrolledGymsModal({ open, onClose }: EnrolledGymsModalProps) {
  const router = useRouter();
  const memberships = useMembershipStore((state) => state.memberships);
  const switching = useMembershipStore((state) => state.switching);
  const fetchMemberships = useMembershipStore((state) => state.fetchMemberships);
  const selectActiveGym = useMembershipStore((state) => state.selectActiveGym);
  const fetchUserStatus = useWalkInApprovalsStore((state) => state.fetchUserStatus);
  const userId = useAuthStore((s) => s.user?.id);
  const requests = useWalkInApprovalsStore((s) => s.requests);

  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (req) =>
          req.userId === userId &&
          !req.consumedAt &&
          (req.status === "pending" || req.status === "approved") &&
          !memberships.some((m) => m.gymId === req.gymId && m.status !== "Expired"),
      ),
    [requests, userId, memberships],
  );

  useEffect(() => {
    if (!open) return;
    void fetchMemberships();
    void fetchUserStatus();
  }, [open, fetchMemberships, fetchUserStatus]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function handleSelect(gymId: string, statusLabel: string) {
    const access = resolveGymAccessStatus(gymId);
    const expired =
      access === "expired" || String(statusLabel).toLowerCase() === "expired";

    if (access === "pending" || access === "approved") {
      onClose();
      router.push("/dashboard/user/membership");
      return;
    }

    if (expired) {
      onClose();
      router.push(`/dashboard/user/gym/${gymId}/join?renew=1`);
      return;
    }

    const ok = await selectActiveGym(gymId);
    if (!ok) {
      onClose();
      router.push("/dashboard/user/membership");
      return;
    }
    onClose();
    router.push("/dashboard/user");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Close enrolled gyms dialog"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Enrolled gyms</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {memberships.length > 0 || pendingRequests.length > 0 ? (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto">
            {memberships.map((item) => (
              <article
                key={item.membershipId || item.gymId}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]"
              >
                <div className="space-y-2 p-4 text-sm text-zinc-400">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{item.gymName}</h3>
                        {item.isCurrent ? (
                          <span className="rounded-full bg-[#FFD700]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FFD700]">
                            Current Gym
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
                        <MapPin className="h-3.5 w-3.5 text-[#FFD700]" />
                        {item.status} membership
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/dashboard/user/gym/${item.gymId}`}
                        onClick={onClose}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                      >
                        View
                      </Link>
                      {item.isCurrent ? (
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-zinc-500"
                        >
                          Selected
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={switching}
                          onClick={() => void handleSelect(item.gymId, item.status)}
                          className="rounded-lg bg-[#FFD700] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e6c200] disabled:opacity-60"
                        >
                          {switching ? "…" : "Select"}
                        </button>
                      )}
                    </div>
                  </div>
                  <p>
                    Plan: <span className="text-white">{item.planName}</span>
                  </p>
                  <p>
                    Type: <span className="text-white">{item.planType}</span>
                  </p>
                  <p>
                    Remaining:{" "}
                    <span className="font-semibold text-[#FFD700]">
                      {item.remainingDays} day{item.remainingDays === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="font-semibold text-[#FFD700]">
                    ₱{item.planPrice.toLocaleString()}
                    <span className="text-sm font-medium text-zinc-500"> plan</span>
                  </p>
                </div>
              </article>
            ))}

            {pendingRequests.map((req) => (
              <article
                key={req.id}
                className="overflow-hidden rounded-xl border border-amber-500/20 bg-[#0A0A0A]"
              >
                <div className="space-y-2 p-4 text-sm text-zinc-400">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {req.gymName || "Gym"}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-400">
                        <MapPin className="h-3.5 w-3.5" />
                        {req.status === "approved"
                          ? "Approved — tap Done on Membership"
                          : "Pending — Waiting for Owner/Clerk Approval"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push("/dashboard/user/membership");
                      }}
                      className="rounded-lg bg-[#FFD700] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e6c200]"
                    >
                      Select
                    </button>
                  </div>
                  <p>
                    Plan: <span className="text-white">{req.planName}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
            <p className="text-sm text-zinc-400">You have not enrolled in a gym yet.</p>
            <Link
              href="/dashboard/user"
              onClick={onClose}
              className="mt-4 inline-flex rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e6c200]"
            >
              Browse gyms
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
