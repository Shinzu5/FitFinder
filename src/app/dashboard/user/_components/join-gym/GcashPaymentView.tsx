"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import type { PublicGymProfile } from "../../_lib/gym-profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  makeXenditRef,
  useJoinGymStore,
} from "@/stores/join-gym-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useAuthStore } from "@/stores/auth-store";
import { JoinGymHeader } from "./JoinGymHeader";
import { buildCompletedMembership } from "./join-utils";

interface GcashPaymentViewProps {
  profile: PublicGymProfile;
}

export function GcashPaymentView({ profile }: GcashPaymentViewProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const joinGym = useMembershipStore((state) => state.joinGym);
  const {
    selectedPlanId,
    selectedCoachId,
    gcashNumber,
    gcashName,
    setGcashNumber,
    setGcashName,
  } = useJoinGymStore();

  const [number, setNumber] = useState(gcashNumber);
  const [name, setName] = useState(gcashName || user?.fullName || "");
  const [error, setError] = useState<string | null>(null);

  const selectedPlan =
    profile.plans.find((plan) => plan.id === selectedPlanId) ?? profile.plans[0];
  const selectedCoach =
    profile.coaches.find((coach) => coach.id === selectedCoachId) ?? null;
  const total = selectedPlan?.price ?? 0;

  function handleSend() {
    const cleanNumber = number.replace(/\s+/g, "");
    if (!/^09\d{9}$/.test(cleanNumber)) {
      setError("Enter a valid GCash mobile number (09XXXXXXXXX).");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter your full name as shown on GCash.");
      return;
    }

    setError(null);
    setGcashNumber(cleanNumber);
    setGcashName(name.trim());

    const paymentRef = makeXenditRef();
    const details = buildCompletedMembership({
      profile,
      plan: selectedPlan,
      coach: selectedCoach,
      paymentMethod: "cashless",
      paymentRef,
    });
    joinGym(details);
    router.push(`/dashboard/user/gym/${profile.id}/join/gcash/success`);
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
            <p className="text-sm text-zinc-500">Powered by Xendit — auto-sent to gym</p>
          </div>
        </div>

        <article className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <p className="text-xs text-zinc-500">Total Amount Due</p>
          <p className="mt-1 text-4xl font-bold text-[#FFD700]">₱{total.toLocaleString()}</p>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
            <span className="text-zinc-400">Membership</span>
            <span className="text-white">
              ₱{total.toLocaleString()} ({selectedPlan?.name})
            </span>
          </div>
        </article>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gcash-number" className="text-white">
              GCash Mobile Number
            </Label>
            <Input
              id="gcash-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="09XX XXX XXXX"
              className="border-0 bg-white text-black placeholder:text-zinc-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gcash-name" className="text-white">
              Your Full Name
            </Label>
            <Input
              id="gcash-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name as on GCash"
              className="border-0 bg-white text-black placeholder:text-zinc-400"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p>
            Xendit processes your payment securely and transfers the full amount directly to the
            gym owner&apos;s account.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSend}
          className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] py-4 text-sm font-bold text-[#FFD700] transition hover:bg-[#222222]"
        >
          Send Mobile Payment →
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
