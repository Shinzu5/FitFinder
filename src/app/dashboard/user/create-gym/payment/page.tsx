"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { CreateGymShell } from "@/components/features/create-gym/CreateGymShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatPlanPrice,
  getAccessUntilDate,
  getOwnerPlan,
} from "@/lib/owner-plans";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { useOwnerPlanTransactionsStore } from "@/stores/owner-plan-transactions-store";

export default function CreateGymPaymentPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const recordPlanPurchase = useOwnerPlanTransactionsStore((state) => state.recordPlanPurchase);
  const {
    selectedPlanId,
    gcashNumber,
    accountName,
    setPaymentDetails,
    completePayment,
  } = useCreateGymStore();
  const plan = getOwnerPlan(selectedPlanId);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState(gcashNumber);
  const [name, setName] = useState(accountName);

  function handleProceed() {
    if (!/^09\d{9}$/.test(number.replace(/\s+/g, ""))) {
      setError("Enter a valid GCash mobile number (09XXXXXXXXX).");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter the account name as shown in GCash.");
      return;
    }

    setError(null);
    setPaymentDetails(number.trim(), name.trim());
    completePayment();
    const { referenceNo, selectedPlanId: planId } = useCreateGymStore.getState();
    if (user && referenceNo) {
      recordPlanPurchase({
        ownerId: user.id,
        ownerName: name.trim() || user.fullName,
        ownerEmail: user.email,
        planId,
        referenceNo,
      });
    }
    router.push("/dashboard/user/create-gym/done");
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
                {getAccessUntilDate(plan.months)}
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
                Powered by Xendit · Secure checkout
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
            {plan.name} Plan · {plan.months} month{plan.months > 1 ? "s" : ""} · The Gym
            Club Platform
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gcashNumber">GCash Mobile Number</Label>
            <Input
              id="gcashNumber"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="09XX XXX XXXX"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name as in GCash"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          Payment is processed securely via Xendit. Your subscription activates
          immediately after confirmation.
        </div>

        <button
          type="button"
          onClick={handleProceed}
          className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] py-3.5 text-sm font-bold text-[#FFD700] transition hover:bg-[#222]"
        >
          Proceed
        </button>
      </div>
    </CreateGymShell>
  );
}
