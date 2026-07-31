"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Smartphone, Zap } from "lucide-react";
import type { PublicGymProfile } from "../../_lib/gym-profile";
import {
  useJoinGymStore,
} from "@/stores/join-gym-store";
import { useAuthStore } from "@/stores/auth-store";
import { JoinGymHeader } from "./JoinGymHeader";
import api from "@/lib/api";

interface GcashPaymentViewProps {
  profile: PublicGymProfile;
}

export function GcashPaymentView({ profile }: GcashPaymentViewProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const {
    selectedPlanId,
    selectedCoachId,
    setXenditPaymentId,
  } = useJoinGymStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan =
    profile.plans.find((plan) => plan.id === selectedPlanId) ?? profile.plans[0];
  const selectedCoach =
    profile.coaches.find((coach) => coach.id === selectedCoachId) ?? null;
  const total = (selectedPlan?.price ?? 0) + (selectedCoach?.sessionPrice ?? 0);

  // Check if returned from Xendit with failure
  const isFailed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("payment_failed") === "true";

  async function handlePayViaGcash() {
    setError(null);
    setLoading(true);

    try {
      const { data } = await api.post("/payments/create-gcash", {
        type: "MEMBERSHIP",
        amount: total,
        description: `${profile.name} — ${selectedPlan?.name} Membership`,
        metadata: {
          gymId: profile.id,
          gymName: profile.name,
          planId: selectedPlan?.id,
          planName: selectedPlan?.name,
          coachId: selectedCoach?.id || null,
          coachName: selectedCoach?.name || null,
        },
      });

      if (data.success && data.data.redirectUrl) {
        setXenditPaymentId(data.data.xenditPaymentId);
        // Redirect to GCash
        window.location.href = data.data.redirectUrl;
        return;
      }

      setError("Failed to create payment. Please try again.");
    } catch (err) {
      console.error("GCash payment error:", err);
      setError("Could not create payment. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <JoinGymHeader
        title="GCash Payment"
        backHref={`/dashboard/user/gym/${profile.id}/join`}
      />

      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white">
            GC
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Pay via GCash</p>
            <p className="text-sm text-zinc-500">Powered by Xendit — secure redirect</p>
          </div>
        </div>

        <article className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <p className="text-xs text-zinc-500">Total Amount Due</p>
          <p className="mt-1 text-4xl font-bold text-[#FFD700]">₱{total.toLocaleString()}</p>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Membership Plan</span>
              <span className="text-white">
                ₱{(selectedPlan?.price ?? 0).toLocaleString()}
                {selectedPlan?.name ? ` (${selectedPlan.name})` : ""}
              </span>
            </div>
            {selectedCoach ? (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Coach Session</span>
                <span className="text-white">
                  ₱{selectedCoach.sessionPrice.toLocaleString()}
                  {selectedCoach.name ? ` (${selectedCoach.name})` : ""}
                </span>
              </div>
            ) : null}
          </div>
        </article>

        {/* How it works */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex items-start gap-3 text-sm text-sky-200">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p>
              You&apos;ll be redirected to GCash to authorize the payment securely.
              No need to enter your phone number — just confirm in the GCash app.
            </p>
          </div>
        </div>

        {(error || isFailed) ? (
          <p className="text-sm text-red-400">
            {error || "Payment was cancelled or failed. Please try again."}
          </p>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p>
            Xendit processes your payment securely and transfers the full amount directly to the
            gym owner&apos;s account.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePayViaGcash}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007DFE] py-4 text-sm font-bold text-white transition hover:bg-[#0066CC] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
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
              Pay ₱{total.toLocaleString()} via GCash
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/dashboard/user/gym/${profile.id}/join`)}
          className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
