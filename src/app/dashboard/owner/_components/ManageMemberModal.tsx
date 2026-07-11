"use client";

import { AlertTriangle } from "lucide-react";
import type { GymMember } from "@/stores/owner-members-store";

interface ManageMemberModalProps {
  member: GymMember | null;
  onClose: () => void;
  onDelete: () => void;
}

export function ManageMemberModal({ member, onClose, onDelete }: ManageMemberModalProps) {
  if (!member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">Manage Member</h2>
        <p className="mt-1 text-sm text-zinc-400">{member.fullName}</p>

        <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-[#0f0f0f] p-4 text-sm">
          <p className="text-zinc-300">
            <span className="text-zinc-500">Email:</span> {member.email}
          </p>
          <p className="text-zinc-300">
            <span className="text-zinc-500">Plan:</span> {member.planName}
          </p>
          <p className="text-zinc-300">
            <span className="text-zinc-500">Remaining:</span> {member.remainingDays} days
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#FFD700]/50 px-4 py-2 text-sm font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500"
          >
            <AlertTriangle className="h-4 w-4" />
            Remove Member
          </button>
        </div>
      </div>
    </div>
  );
}
