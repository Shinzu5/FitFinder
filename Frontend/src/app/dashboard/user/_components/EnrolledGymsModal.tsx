"use client";

import { useEffect } from "react";
import { MapPin, X } from "lucide-react";
import Link from "next/link";
import { useMembershipStore } from "@/stores/membership-store";

interface EnrolledGymsModalProps {
  open: boolean;
  onClose: () => void;
}

export function EnrolledGymsModal({ open, onClose }: EnrolledGymsModalProps) {
  const membership = useMembershipStore((state) => state.membership);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);

  useEffect(() => {
    if (open) void fetchMembership();
  }, [open, fetchMembership]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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

        {membership ? (
          <article className="overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]">
            <div className="space-y-2 p-4 text-sm text-zinc-400">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{membership.gymName}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
                    <MapPin className="h-3.5 w-3.5 text-[#FFD700]" />
                    Active membership
                  </p>
                </div>
                <Link
                  href={`/dashboard/user/gym/${membership.gymId}`}
                  onClick={onClose}
                  className="rounded-lg bg-[#FFD700] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e6c200]"
                >
                  View
                </Link>
              </div>
              <p>
                Plan: <span className="text-white">{membership.planName}</span>
              </p>
              <p className="font-semibold text-[#FFD700]">
                ₱{membership.planPrice.toLocaleString()}
                <span className="text-sm font-medium text-zinc-500"> plan</span>
              </p>
            </div>
          </article>
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
