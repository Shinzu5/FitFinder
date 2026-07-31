"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  CreditCard,
  User,
  UserCircle2,
} from "lucide-react";
import type { PublicGymProfile } from "../../_lib/gym-profile";
import { getPlanSubtitle } from "../../_lib/use-gym-profile";
import { useJoinGymStore } from "@/stores/join-gym-store";
import { WEEK_DAYS, getCoachInitials } from "@/stores/owner-coaches-store";
import { JoinGymHeader } from "./JoinGymHeader";

interface JoinSelectPaymentProps {
  profile: PublicGymProfile;
}

export function JoinSelectPayment({ profile }: JoinSelectPaymentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRenewal = searchParams.get("renew") === "1";
  const {
    gymId,
    selectedPlanId,
    paymentMethod,
    selectedCoachId,
    initJoin,
    setPlanId,
    setPaymentMethod,
    setCoachId,
  } = useJoinGymStore();

  const [coachOpen, setCoachOpen] = useState(false);
  const [coachUnavailableNotice, setCoachUnavailableNotice] = useState<string | null>(null);
  const cashlessEnabled = Boolean(profile.cashlessEnabled);

  const defaultPlanId = profile.plans[0]?.id ?? "";

  useEffect(() => {
    if (gymId !== profile.id) {
      initJoin(profile.id, defaultPlanId, cashlessEnabled);
    }
  }, [profile.id, gymId, initJoin, defaultPlanId, cashlessEnabled]);

  useEffect(() => {
    if (!cashlessEnabled && paymentMethod === "cashless") {
      setPaymentMethod("walk-in");
    }
  }, [cashlessEnabled, paymentMethod, setPaymentMethod]);

  // Clear selection if coach was deleted / inactivated via realtime update
  useEffect(() => {
    if (!selectedCoachId) return;
    if (!profile.coaches.some((c) => c.id === selectedCoachId)) {
      setCoachId(null);
      setCoachUnavailableNotice(
        "Your selected coach is no longer available. Please choose another coach or continue without one.",
      );
    }
  }, [profile.coaches, selectedCoachId, setCoachId]);

  // Keep plan selection on an active Neon plan when Owner deletes/updates plans live
  useEffect(() => {
    if (profile.plans.length === 0) {
      if (selectedPlanId) setPlanId("");
      return;
    }
    if (!selectedPlanId || !profile.plans.some((p) => p.id === selectedPlanId)) {
      setPlanId(profile.plans[0].id);
    }
  }, [profile.plans, selectedPlanId, setPlanId]);

  const selectedPlan = useMemo(
    () => profile.plans.find((plan) => plan.id === selectedPlanId) ?? profile.plans[0],
    [profile.plans, selectedPlanId],
  );

  const selectedCoach = useMemo(
    () => profile.coaches.find((coach) => coach.id === selectedCoachId) ?? null,
    [profile.coaches, selectedCoachId],
  );

  const total = (selectedPlan?.price ?? 0) + (selectedCoach?.sessionPrice ?? 0);

  function handleConfirm() {
    if (!selectedPlan) return;
    const renewQuery = isRenewal ? "?renew=1" : "";
    if (paymentMethod === "cashless" && cashlessEnabled) {
      router.push(`/dashboard/user/gym/${profile.id}/join/gcash${renewQuery}`);
      return;
    }
    router.push(`/dashboard/user/gym/${profile.id}/join/walk-in${renewQuery}`);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <JoinGymHeader
        title={isRenewal ? "Renew Membership — Select Payment" : "Join Gym — Select Payment"}
        backHref={isRenewal ? "/dashboard/user/membership" : `/dashboard/user/gym/${profile.id}`}
      />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <article className="relative rounded-2xl border border-white/10 bg-[#141414] p-5">
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#FFD700] px-2.5 py-1 text-[10px] font-bold uppercase text-black">
            <Check className="h-3 w-3" />
            Joining
          </span>
          <h2 className="pr-24 text-xl font-bold uppercase tracking-wide text-white">
            {profile.name}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{profile.location}</p>
        </article>

        <section>
          <p className="mb-3 text-xs text-zinc-500">Choose Payment Method</p>
          <div className={`grid gap-3 ${cashlessEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
            {cashlessEnabled ? (
              <button
                type="button"
                onClick={() => setPaymentMethod("cashless")}
                className={`relative rounded-xl border p-4 text-left transition ${
                  paymentMethod === "cashless"
                    ? "border-[#FFD700] bg-[#141414]"
                    : "border-white/10 bg-[#141414] hover:border-white/20"
                }`}
              >
                <span
                  className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ${
                    paymentMethod === "cashless"
                      ? "bg-[#FFD700] text-black"
                      : "border border-zinc-600"
                  }`}
                >
                  {paymentMethod === "cashless" ? <Check className="h-3 w-3" /> : null}
                </span>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                  <CreditCard className="h-4 w-4 text-sky-400" />
                </div>
                <p className="font-semibold text-white">Cashless</p>
                <p className="mt-1 text-xs text-[#FFD700]">
                  GCash, Maya &amp; Xendit methods
                </p>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setPaymentMethod("walk-in")}
              className={`relative rounded-xl border p-4 text-left transition ${
                paymentMethod === "walk-in"
                  ? "border-[#FFD700] bg-[#141414]"
                  : "border-white/10 bg-[#141414] hover:border-white/20"
              }`}
            >
              <span
                className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ${
                  paymentMethod === "walk-in"
                    ? "bg-[#FFD700] text-black"
                    : "border border-zinc-600"
                }`}
              >
                {paymentMethod === "walk-in" ? <Check className="h-3 w-3" /> : null}
              </span>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                <User className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="font-semibold text-white">Walk-in</p>
              <p className="mt-1 text-xs text-zinc-500">Pay cash at front desk</p>
            </button>
          </div>
          {!cashlessEnabled ? (
            <p className="mt-2 text-xs text-zinc-500">
              This gym accepts Walk-in (over-the-counter) payment only.
            </p>
          ) : null}
        </section>

        <section>
          <p className="mb-3 text-xs text-zinc-500">Select Plan</p>
          {profile.plans.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#141414] px-4 py-6">
              <p className="text-sm text-zinc-400">No membership plans available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profile.plans.map((plan) => {
                const active = selectedPlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-[#FFD700] bg-[#141414]"
                        : "border-white/10 bg-[#141414] hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        active ? "border-[#FFD700] bg-[#FFD700]" : "border-zinc-600"
                      }`}
                    >
                      {active ? <span className="h-2 w-2 rounded-full bg-black" /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{plan.name}</p>
                      <p className="text-xs text-zinc-500">{getPlanSubtitle(plan.name)}</p>
                    </div>
                    <p className="shrink-0 text-lg font-bold text-[#FFD700]">
                      ₱{plan.price.toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {coachUnavailableNotice ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {coachUnavailableNotice}
          </p>
        ) : null}

        {profile.coaches.length > 0 ? (
          <section>
            <p className="mb-3 text-xs text-zinc-500">Add a Coach (optional)</p>
            <div className="rounded-xl border border-white/10 bg-[#141414]">
              <button
                type="button"
                onClick={() => setCoachOpen((open) => !open)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                  <UserCircle2 className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">
                    {selectedCoach ? selectedCoach.name : "No coach selected"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {selectedCoach
                      ? `${selectedCoach.specialty} · + ₱${selectedCoach.sessionPrice.toLocaleString()}/session`
                      : "Tap to add a personal coach"}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition ${coachOpen ? "rotate-180" : ""}`}
                />
              </button>

              {coachOpen ? (
                <div className="border-t border-white/10 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCoachId(null);
                      setCoachUnavailableNotice(null);
                      setCoachOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                      !selectedCoachId ? "bg-white/5 text-[#FFD700]" : "text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    No coach
                  </button>
                  {profile.coaches.map((coach) => (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => {
                        setCoachId(coach.id);
                        setCoachUnavailableNotice(null);
                        setCoachOpen(false);
                      }}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                        selectedCoachId === coach.id
                          ? "bg-white/5 text-[#FFD700]"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="font-medium">{coach.name}</span>
                      <span className="text-zinc-500">
                        {" "}
                        · {coach.specialty} · + ₱{coach.sessionPrice.toLocaleString()}/session
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selectedCoach ? (
              <article className="mt-3 rounded-xl border border-white/10 bg-[#141414] p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Coach Details
                </p>
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                    {selectedCoach.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedCoach.photoUrl}
                        alt={selectedCoach.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#FFD700]/15 text-sm font-bold text-[#FFD700]">
                        {getCoachInitials(selectedCoach.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{selectedCoach.name}</p>
                    <p className="text-sm text-[#FFD700]">{selectedCoach.specialty}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      ₱{selectedCoach.sessionPrice.toLocaleString()}/session
                    </p>
                    {selectedCoach.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        {selectedCoach.description}
                      </p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500 sm:grid-cols-3">
                      {WEEK_DAYS.map((day) => (
                        <p key={day.key}>
                          <span className="text-zinc-600">{day.short}</span>{" "}
                          {selectedCoach.schedule?.[day.key] || "Off"}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

        <article className="rounded-xl border border-white/10 bg-[#141414] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Membership Plan</span>
            <span className="text-white">₱{(selectedPlan?.price ?? 0).toLocaleString()}</span>
          </div>
          {selectedCoach ? (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-500">Coach Session</span>
              <span className="text-white">₱{selectedCoach.sessionPrice.toLocaleString()}</span>
            </div>
          ) : null}
          <div className="my-3 border-t border-white/10" />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#FFD700]">Total</span>
            <span className="text-xl font-bold text-[#FFD700]">₱{total.toLocaleString()}</span>
          </div>
        </article>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedPlan || profile.plans.length === 0}
          className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] py-4 text-sm font-bold text-[#FFD700] transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm Payment
        </button>
      </div>
    </div>
  );
}
