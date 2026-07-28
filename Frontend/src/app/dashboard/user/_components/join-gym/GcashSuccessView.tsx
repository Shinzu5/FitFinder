"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, XCircle } from "lucide-react";
import { useMembershipStore } from "@/stores/membership-store";
import { useJoinGymStore } from "@/stores/join-gym-store";
import { JoinGymHeader } from "./JoinGymHeader";
import api from "@/lib/api";

interface GcashSuccessViewProps {
  gymId: string;
}

export function GcashSuccessView({ gymId }: GcashSuccessViewProps) {
  const router = useRouter();
  const membership = useMembershipStore((state) => state.membership);
  const { xenditPaymentId, resetJoin } = useJoinGymStore();

  const [verifying, setVerifying] = useState(!!xenditPaymentId);
  const [failed, setFailed] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    referenceId: string;
    amount: number;
    status: string;
  } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  // Poll payment status on mount
  useEffect(() => {
    if (!xenditPaymentId) {
      setVerifying(false);
      return;
    }

    async function poll() {
      pollCountRef.current += 1;

      try {
        const { data } = await api.get(`/payments/${xenditPaymentId}/status`);

        if (data.success) {
          const status = data.data.status;

          if (status === "SUCCEEDED") {
            setPaymentDetails({
              referenceId: data.data.referenceId,
              amount: data.data.amount,
              status: "SUCCEEDED",
            });
            setVerifying(false);
            return;
          }

          if (status === "FAILED" || status === "EXPIRED" || pollCountRef.current >= 30) {
            setVerifying(false);
            setFailed(true);
            return;
          }
        }
      } catch (err) {
        console.error("Payment status poll error:", err);
      }

      // Poll every 2 seconds
      pollRef.current = setTimeout(poll, 2000);
    }

    setVerifying(true);
    poll();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [xenditPaymentId]);

  // Verifying state
  if (verifying) {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader title="GCash Payment" backHref={`/dashboard/user/gym/${gymId}/join/gcash`} />
        <div className="mx-auto max-w-xl py-20 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#FFD700]" />
          <h2 className="mt-6 text-xl font-bold text-white">Verifying payment...</h2>
          <p className="mt-2 text-sm text-zinc-400">
            We&apos;re confirming your GCash payment. This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  // Failed state
  if (failed) {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader title="GCash Payment" backHref={`/dashboard/user/gym/${gymId}/join/gcash`} />
        <div className="mx-auto max-w-xl py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400">Payment not confirmed</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
            We couldn&apos;t verify your payment. If you completed the payment in GCash,
            please wait a moment and refresh.
          </p>
          <div className="mt-8 flex flex-col gap-3 px-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/10 bg-[#1a1a1a] py-3 text-sm font-bold text-[#FFD700] transition hover:bg-[#222]"
            >
              Refresh Status
            </button>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/user/gym/${gymId}/join`)}
              className="rounded-xl border border-white/10 bg-[#1a1a1a] py-3 text-sm font-bold text-white transition hover:bg-[#222]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state (either from Xendit polling or existing membership)
  const displayData = paymentDetails || (membership && membership.gymId === gymId
    ? {
        referenceId: membership.paymentRef,
        amount: membership.totalPaid,
        status: "SUCCEEDED",
      }
    : null);

  if (!displayData) {
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
          <h2 className="text-2xl font-bold text-emerald-400">Payment Confirmed!</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Your GCash payment was verified successfully. Your membership is now active.
          </p>
        </div>

        <article className="rounded-2xl border border-white/10 bg-[#141414] p-5 text-left text-sm">
          {membership && membership.gymId === gymId ? (
            <>
              <DetailRow label="Gym" value={membership.gymName} />
              <DetailRow label="Plan" value={membership.planName} />
              <DetailRow label="Coach" value={membership.coachName ?? "None"} />
            </>
          ) : null}
          <DetailRow
            label="Total Paid"
            value={`₱${displayData.amount.toLocaleString()}`}
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
          <DetailRow label="Ref" value={displayData.referenceId} />
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
