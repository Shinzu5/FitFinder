"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Check,
  CreditCard,
  Hash,
  Loader2,
  Receipt,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { CreateGymShell } from "@/components/features/create-gym/CreateGymShell";
import { formatPlanPrice, getOwnerPlan } from "@/lib/owner-plans";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";

export default function CreateGymDonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const {
    selectedPlanId,
    paymentComplete,
    referenceNo,
    validUntil,
    xenditPaymentId,
    checkPaymentStatus,
  } = useCreateGymStore();
  const plan = getOwnerPlan(selectedPlanId);

  const [verifying, setVerifying] = useState(!paymentComplete && !!xenditPaymentId);
  const [failed, setFailed] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  // On mount, if we have a xenditPaymentId but payment isn't complete, poll for status
  useEffect(() => {
    if (paymentComplete || !xenditPaymentId) return;

    setVerifying(true);

    async function poll() {
      pollCountRef.current += 1;
      const status = await checkPaymentStatus();

      if (status === "SUCCEEDED") {
        setVerifying(false);
        return;
      }

      if (status === "FAILED" || pollCountRef.current >= 30) {
        setVerifying(false);
        setFailed(true);
        return;
      }

      // Poll every 2 seconds
      pollRef.current = setTimeout(poll, 2000);
    }

    poll();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [paymentComplete, xenditPaymentId, checkPaymentStatus]);

  // If no payment in progress and not complete, redirect to plan selection
  useEffect(() => {
    if (!paymentComplete && !xenditPaymentId) {
      router.replace("/dashboard/user/create-gym");
    }
  }, [paymentComplete, xenditPaymentId, router]);

  // Loading/verifying state
  if (verifying) {
    return (
      <CreateGymShell step={3} backHref="/dashboard/user" backLabel="Processing payment">
        <div className="mx-auto max-w-xl py-20 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#FFD700]" />
          <h2 className="mt-6 text-xl font-bold text-white">Verifying payment...</h2>
          <p className="mt-2 text-sm text-zinc-400">
            We&apos;re confirming your GCash payment. This usually takes a few seconds.
          </p>
        </div>
      </CreateGymShell>
    );
  }

  // Failed state
  if (failed) {
    return (
      <CreateGymShell step={3} backHref="/dashboard/user/create-gym/payment" backLabel="Back to payment">
        <div className="mx-auto max-w-xl py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400">Payment not confirmed</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
            We couldn&apos;t verify your payment. If you completed the payment in GCash,
            it may take a moment — please wait and refresh, or try again.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/10 bg-[#1a1a1a] py-3 text-sm font-bold text-[#FFD700] transition hover:bg-[#222]"
            >
              Refresh Status
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/user/create-gym/payment")}
              className="rounded-xl border border-white/10 bg-[#1a1a1a] py-3 text-sm font-bold text-white transition hover:bg-[#222]"
            >
              Try Again
            </button>
          </div>
        </div>
      </CreateGymShell>
    );
  }

  if (!paymentComplete) return null;

  const ownerName = user?.fullName || "Gym Owner";

  return (
    <CreateGymShell step={3} backHref="/dashboard/user" backLabel="Payment complete">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-8 w-8 text-white" strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-bold text-emerald-400">You&apos;re all set!</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
            Payment confirmed. Your {plan.name} Plan is now active. Start setting up your
            gym on the platform.
          </p>
        </div>

        <div className="rounded-2xl border border-[#FFD700]/40 bg-[#141414] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFD700]/15 text-[#FFD700]">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Payment receipt</p>
              <p className="text-xs text-zinc-500">The Gym Club Platform</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <ReceiptRow icon={User} label="Owner" value={ownerName} />
            <ReceiptRow
              icon={CalendarDays}
              label="Plan"
              value={`${plan.name} — ${plan.months} month${plan.months > 1 ? "s" : ""}`}
            />
            <ReceiptRow
              icon={Building2}
              label="Gym slots"
              value={
                plan.gymSlots >= 999
                  ? "Unlimited gym registrations"
                  : `${plan.gymSlots} gym registration`
              }
            />
            <ReceiptRow icon={Users} label="Valid until" value={validUntil ?? "—"} />
            <ReceiptRow icon={CreditCard} label="Paid via" value="GCash · Xendit" />
            <ReceiptRow
              icon={Receipt}
              label="Amount paid"
              value={`₱${formatPlanPrice(plan.price)}.00`}
              highlight
            />
            <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
              <span className="flex items-center gap-2 text-zinc-400">
                <Check className="h-4 w-4" />
                Status
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Confirmed
              </span>
            </div>
            <ReceiptRow icon={Hash} label="Ref no." value={referenceNo ?? "—"} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <h2 className="mb-4 font-semibold text-white">What to do next</h2>
          <ol className="space-y-4">
            {[
              {
                title: "Create your gym",
                body: "Go to your owner dashboard and register your gym with a name, slug, and description.",
              },
              {
                title: "Set up Xendit API key",
                body: "In Settings, enter your Xendit secret key so members can pay you directly.",
              },
              {
                title: "Add coaches & plans",
                body: "Create membership plans and add coaches with pricing and availability.",
              },
              {
                title: "Wait for admin approval",
                body: "Your gym goes live after the platform admin approves your listing.",
              },
            ].map((item, index) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-xs font-bold text-black">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-400">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/user/create-gym/register")}
          className="w-full rounded-xl bg-[#F5F0E1] py-3.5 text-sm font-bold text-black transition hover:bg-white"
        >
          Create your Gym
        </button>
      </div>
    </CreateGymShell>
  );
}

function ReceiptRow({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className={`text-right font-medium ${highlight ? "text-[#FFD700]" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
