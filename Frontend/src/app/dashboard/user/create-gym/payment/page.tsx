"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { CreateGymShell } from "@/components/features/create-gym/CreateGymShell";
import {
  formatPlanPrice,
  getAccessUntilDate,
  getOwnerPlan,
} from "@/lib/owner-plans";
import { useCreateGymStore } from "@/stores/create-gym-store";

export default function CreateGymPaymentPage() {
  const router = useRouter();
  const {
    selectedPlanId,
    paymentLoading,
    paymentError,
    initiateGcashPayment,
  } = useCreateGymStore();
  const plan = getOwnerPlan(selectedPlanId);
  const [error, setError] = useState<string | null>(null);

  // Check if payment_failed query param is present (returned from Xendit failure)
  const isFailed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("payment_failed") === "true";

  async function handlePayViaGcash() {
    setError(null);

    const redirectUrl = await initiateGcashPayment();

    if (redirectUrl) {
      // Redirect user to GCash authorization page
      window.location.href = redirectUrl;
    } else {
      setError("Could not create payment. Please check your connection and try again.");
    }
  }

  return (
    <CreateGymShell
      step={2}
      backHref="/dashboard/user/create-gym"
      backLabel="Back to Plan"
    >
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <p className="mb-2 text-sm text-zinc-400">Selected Plan</p>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#FFD700]/50 bg-[#141414] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFD700]">
                <CalendarDays className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="font-semibold text-[#FFD700]">{plan.name} Plan</p>
                <p className="text-xs text-zinc-400">{plan.description}</p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-semibold text-[#FFD700]">
              ₱{formatPlanPrice(plan.price)} {plan.periodLabel}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#141414] p-3">
              <p className="text-xs text-zinc-500">Platform access until</p>
              <p className="mt-1 text-sm font-medium text-white">
                {getAccessUntilDate(plan.days)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#141414] p-3">
              <p className="text-xs text-zinc-500">Gym slots included</p>
              <p className="mt-1 text-sm font-medium text-white">
                {plan.gymSlots >= 999 ? "Unlimited gyms" : `${plan.gymSlots} gym`}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-zinc-400">Pay via GCash</p>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#141414] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#007DFE] text-sm font-bold text-white">
              G
            </div>
            <div>
              <p className="font-medium text-white">GCash payment</p>
              <p className="text-xs text-zinc-400">
                Powered by Xendit · Secure redirect
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
          <p className="text-sm text-zinc-400">Total Amount</p>
          <p className="mt-1 text-3xl font-bold text-[#FFD700]">
            ₱{formatPlanPrice(plan.price)}.00
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {plan.name} Plan · {plan.days} days · FitFinder Platform
          </p>
        </div>

        {/* Info: How the redirect works */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex items-start gap-3 text-sm text-sky-200">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p>
              You&apos;ll be redirected to GCash to authorize the payment securely.
              No need to enter your phone number — just confirm in the GCash app.
            </p>
          </div>
        </div>

        {(error || paymentError || isFailed) ? (
          <p className="text-sm text-red-400">
            {error || paymentError || "Payment was cancelled or failed. Please try again."}
          </p>
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          Payment is processed securely via Xendit. Your subscription activates
          immediately after confirmation.
        </div>

        <button
          type="button"
          onClick={handlePayViaGcash}
          disabled={paymentLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007DFE] py-3.5 text-sm font-bold text-white transition hover:bg-[#0066CC] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paymentLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating payment...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="white" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#007DFE">G</text>
              </svg>
              Pay ₱{formatPlanPrice(plan.price)} via GCash
            </>
          )}
        </button>
      </div>
    </CreateGymShell>
  );
}
