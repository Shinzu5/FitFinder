"use client";

import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Check, Dumbbell } from "lucide-react";
import { CreateGymShell } from "@/components/features/create-gym/CreateGymShell";
import {
  OWNER_PLANS,
  formatPlanPrice,
  type OwnerPlanId,
} from "@/lib/owner-plans";
import { useCreateGymStore } from "@/stores/create-gym-store";

const ICONS = {
  starter: Dumbbell,
  standard: CalendarDays,
  pro: Building2,
} as const;

export default function CreateGymPlanPage() {
  const router = useRouter();
  const { selectedPlanId, setSelectedPlanId } = useCreateGymStore();

  function selectPlan(id: OwnerPlanId) {
    setSelectedPlanId(id);
  }

  return (
    <CreateGymShell step={1} backHref="/dashboard/user" backLabel="Back to dashboard">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight">Select your plan</h1>

        <div className="grid gap-4 md:grid-cols-3">
          {OWNER_PLANS.map((plan) => {
            const selected = selectedPlanId === plan.id;
            const Icon = ICONS[plan.id];
            const accentClass =
              plan.accent === "yellow"
                ? "text-[#FFD700]"
                : plan.accent === "teal"
                  ? "text-teal-300"
                  : "text-white";
            const iconBg =
              plan.accent === "yellow"
                ? "bg-[#FFD700]"
                : plan.accent === "teal"
                  ? "bg-teal-500"
                  : "bg-violet-500";
            const barColor =
              plan.accent === "yellow"
                ? "bg-[#FFD700]"
                : plan.accent === "teal"
                  ? "bg-teal-400"
                  : "bg-[#FFD700]";

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => selectPlan(plan.id)}
                className={`relative rounded-2xl border p-5 text-left transition ${
                  selected
                    ? "border-[#FFD700] bg-[#141414] shadow-[0_0_0_1px_rgba(255,215,0,0.35)]"
                    : "border-white/10 bg-[#111111] hover:border-white/20"
                }`}
              >
                {plan.badge ? (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide ${
                      plan.badgeTone === "teal"
                        ? "bg-teal-500 text-white"
                        : "bg-[#FFD700] text-black"
                    }`}
                  >
                    {plan.badge}
                  </span>
                ) : null}

                <div
                  className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border ${
                    selected ? "border-[#FFD700] bg-[#FFD700]" : "border-zinc-500"
                  }`}
                >
                  {selected ? <Check className="h-3 w-3 text-black" strokeWidth={3} /> : null}
                </div>

                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>

                <h2 className={`text-lg font-semibold ${selected && plan.accent === "yellow" ? "text-[#FFD700]" : accentClass}`}>
                  {plan.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>

                <div className="mt-6 flex items-start gap-2">
                  <div className={`mt-1 h-10 w-1 rounded-full ${barColor}`} />
                  <div>
                    <p className={`text-3xl font-bold ${selected && plan.accent === "yellow" ? "text-[#FFD700]" : accentClass}`}>
                      {formatPlanPrice(plan.price)}
                    </p>
                    <p className="text-sm text-zinc-500">{plan.periodLabel}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Tap a plan to select it, then proceed to payment
        </p>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/dashboard/user/create-gym/payment")}
            className="rounded-xl bg-[#FFD700] px-8 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            Proceed to payment
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-red-400">
          Please note: if you are in owner mode, you cannot join another gym.
        </p>
      </div>
    </CreateGymShell>
  );
}
