"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getMemberInitials,
  getMembershipProgress,
  type GymMember,
  useOwnerMembersStore,
} from "@/stores/owner-members-store";
import { ManageMemberModal } from "./ManageMemberModal";

function StatusBadge({ status }: { status: GymMember["status"] }) {
  if (status === "expiring") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        expiring
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
      active
    </span>
  );
}

function MemberCard({
  member,
  onManage,
}: {
  member: GymMember;
  onManage: () => void;
}) {
  const progress = getMembershipProgress(member);

  return (
    <article className="rounded-2xl border border-white/10 bg-[#141414] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/20 text-sm font-semibold text-[#FFD700]">
            {getMemberInitials(member.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">{member.fullName}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {member.billingCycle}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-zinc-500">{member.email}</p>
            {member.addedByClerk ? (
              <span className="mt-2 inline-block rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                Added by Clerk
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
          <div>
            <p className="text-xs text-zinc-500">Plan</p>
            <p className="mt-1 text-sm font-medium text-white">{member.planName}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Remaining {member.remainingDays} days</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-[#FFD700] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
          {member.paymentStatus === "paid" ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Paid
            </span>
          ) : (
            <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
              Unpaid
            </span>
          )}
          <StatusBadge status={member.status} />
          <button
            type="button"
            onClick={onManage}
            className="rounded-lg border border-[#FFD700]/50 px-4 py-2 text-xs font-bold tracking-wide text-[#FFD700] transition hover:bg-[#FFD700]/10"
          >
            MANAGE
          </button>
        </div>
      </div>
    </article>
  );
}

export function MembersPanel() {
  const members = useOwnerMembersStore((state) => state.members);
  const removeMember = useOwnerMembersStore((state) => state.removeMember);
  const [query, setQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null);

  const filteredMembers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return members;
    return members.filter(
      (member) =>
        member.fullName.toLowerCase().includes(trimmed) ||
        member.email.toLowerCase().includes(trimmed) ||
        member.planName.toLowerCase().includes(trimmed),
    );
  }, [members, query]);

  function handleDelete() {
    if (!selectedMember) return;
    removeMember(selectedMember.id);
    setSelectedMember(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
              {members.length === 0
                ? "No members yet."
                : "No members match your search."}
            </p>
          ) : (
            filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onManage={() => setSelectedMember(member)}
              />
            ))
          )}
        </div>
      </div>

      <ManageMemberModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onDelete={handleDelete}
      />
    </>
  );
}
