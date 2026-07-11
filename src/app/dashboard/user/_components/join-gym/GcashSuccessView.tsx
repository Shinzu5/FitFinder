"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useMembershipStore } from "@/stores/membership-store";
import { useJoinGymStore } from "@/stores/join-gym-store";
import { JoinGymHeader } from "./JoinGymHeader";

interface GcashSuccessViewProps {
  gymId: string;
}

export function GcashSuccessView({ gymId }: GcashSuccessViewProps) {
  const router = useRouter();
  const membership = useMembershipStore((state) => state.membership);
  const resetJoin = useJoinGymStore((state) => state.resetJoin);

  if (!membership || membership.gymId !== gymId) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white">
        <p className="text-zinc-400">No payment record found.</p>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/user/gym/${gymId}/join`)}
          className="mt-4 text-[#FFD700] hover:underline"
        >
          Back to payment
        </button>
      </div>
    );
  }

  function handleDone() {
    resetJoin();
    router.push("/dashboard/user");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <JoinGymHeader title="GCash Payment" backHref={`/dashboard/user/gym/${gymId}/join/gcash`} />

      <div className="mx-auto max-w-xl space-y-6 px-4 py-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-emerald-400">Payment Sent!</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Your GCash payment was received. The gym owner has been notified.
          </p>
        </div>

        <article className="rounded-2xl border border-white/10 bg-[#141414] p-5 text-left text-sm">
          <DetailRow label="Gym" value={membership.gymName} />
          <DetailRow label="Plan" value={membership.planName} />
          <DetailRow label="Coach" value={membership.coachName ?? "None"} />
          <DetailRow
            label="Total Paid"
            value={`₱${membership.totalPaid.toLocaleString()}`}
            highlight
          />
          <DetailRow label="Via" value="GCash / Xendit" />
          <DetailRow
            label="Status"
            value={
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Confirmed
              </span>
            }
          />
          <DetailRow label="Ref" value={membership.paymentRef} />
        </article>

        <button
          type="button"
          onClick={handleDone}
          className="w-full rounded-xl border border-[#FFD700]/40 py-4 text-sm font-bold text-[#FFD700] transition hover:bg-[#FFD700]/10"
        >
          Done →
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className={highlight ? "font-bold text-[#FFD700]" : "text-white"}>{value}</span>
    </div>
  );
}
