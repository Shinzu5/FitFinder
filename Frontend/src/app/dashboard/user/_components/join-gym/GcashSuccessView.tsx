"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const membership = useMembershipStore((state) => state.membership);
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const { xenditPaymentId, setXenditPaymentId, resetJoin } = useJoinGymStore();

  const urlPaymentId = searchParams.get("payment_id");
  const paymentLookupId = xenditPaymentId || urlPaymentId;

  const [verifying, setVerifying] = useState(!!paymentLookupId);
  const [failed, setFailed] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    referenceId: string;
    amount: number;
    status: string;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (urlPaymentId && !xenditPaymentId) {
      setXenditPaymentId(urlPaymentId);
    }
  }, [urlPaymentId, xenditPaymentId, setXenditPaymentId]);

  useEffect(() => {
    void fetchMembership();
  }, [fetchMembership]);

  // Already active for this gym — skip waiting
  useEffect(() => {
    if (joinedGymId === gymId && membership?.gymId === gymId) {
      setVerifying(false);
      setFailed(false);
    }
  }, [joinedGymId, membership, gymId]);

  useEffect(() => {
    if (!paymentLookupId) {
      setVerifying(false);
      return;
    }

    async function poll() {
      pollCountRef.current += 1;

      try {
        const { data } = await api.get(`/payments/${paymentLookupId}/status`);

        if (data.success) {
          const status = data.data.status;

          if (status === "SUCCEEDED") {
            setPaymentDetails({
              referenceId: data.data.referenceId,
              amount: data.data.amount,
              status: "SUCCEEDED",
            });

            // Activate membership then unlock dashboard only when membership is live
            await fetchMembership();
            const activeGymId = useMembershipStore.getState().joinedGymId;
            const membershipActive = Boolean(data.data.membershipActive) || activeGymId === gymId;

            if (membershipActive && (activeGymId === gymId || useMembershipStore.getState().membership)) {
              await fetchMembership();
              if (useMembershipStore.getState().joinedGymId === gymId) {
                setVerifying(false);
                return;
              }
            }

            // Payment succeeded but membership not visible yet — keep polling briefly
            if (pollCountRef.current >= 30) {
              setVerifying(false);
              // Show success UI if payment cleared; membership may still sync on Done
              if (data.data.membershipActive) {
                setFailed(false);
              } else {
                setFailed(true);
              }
              return;
            }

            pollRef.current = setTimeout(poll, 1500);
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

      pollRef.current = setTimeout(poll, 2000);
    }

    setVerifying(true);
    poll();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [paymentLookupId, fetchMembership, gymId]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader title="GCash Payment" backHref={`/dashboard/user/gym/${gymId}/join/gcash`} />
        <div className="mx-auto max-w-xl py-20 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#FFD700]" />
          <h2 className="mt-6 text-xl font-bold text-white">Activating membership...</h2>
          <p className="mt-2 text-sm text-zinc-400">
            We&apos;re confirming your GCash payment and unlocking your Gymer dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (failed && joinedGymId !== gymId) {
    return (
      <div className="min-h-screen bg-black text-white">
        <JoinGymHeader title="GCash Payment" backHref={`/dashboard/user/gym/${gymId}/join/gcash`} />
        <div className="mx-auto max-w-xl py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400">Payment not confirmed</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
            We couldn&apos;t verify your payment. If you completed the payment in GCash, please wait
            a moment and refresh.
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

  const displayData =
    paymentDetails ||
    (membership && membership.gymId === gymId
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
    void fetchMembership().then(() => {
      router.push("/dashboard/user");
    });
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
            Your GCash payment was received. Your membership is active and your Gymer dashboard is
            unlocked.
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
                Confirmed <Check className="h-3.5 w-3.5" />
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
