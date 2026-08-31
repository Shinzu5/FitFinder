"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerkStore } from "@/stores/clerk-store";

export function RegisterMemberPanel() {
  const router = useRouter();
  const registerMember = useClerkStore((state) => state.registerMember);
  const plans = useClerkStore((state) => state.plans);
  const fetchPlans = useClerkStore((state) => state.fetchPlans);
  const errorFromStore = useClerkStore((state) => state.error);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  // Keep selection valid when Owner creates/updates/deletes plans in realtime
  useEffect(() => {
    if (plans.length === 0) {
      setPlanId("");
      return;
    }
    if (!planId || !plans.some((plan) => plan.id === planId)) {
      setPlanId(plans[0].id);
    }
  }, [plans, planId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError("First name, last name, and phone number are required.");
      return;
    }

    if (!planId) {
      setError("Please select a membership plan.");
      return;
    }

    setSubmitting(true);
    const member = await registerMember({
      firstName,
      lastName,
      phone,
      email: email || undefined,
      planId,
    });
    setSubmitting(false);

    if (!member) {
      setError(errorFromStore || "Could not register member. Please try again.");
      return;
    }

    setSuccess(true);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setPlanId(plans[0]?.id || "");

    window.setTimeout(() => {
      setSuccess(false);
      router.push("/dashboard/clerk/members");
    }, 1200);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-white">New Member</h2>
          <div className="flex gap-2">
            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-white">
              Active
            </span>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            Member registered successfully!
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium text-zinc-300">
              First Name
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]/40"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium text-zinc-300">
              Last Name
            </label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]/40"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-zinc-300">
              Phone Number
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]/40"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-300">
              Email (Optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none focus:border-[#FACC15]/40"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium text-zinc-300">Select Plan</p>
          {plans.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-[#131315] px-4 py-4 text-sm text-zinc-500">
              No membership plans found for this gym. Ask the owner to create plans first.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setPlanId(plan.id)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    planId === plan.id
                      ? "border-[#FACC15] bg-[#FACC15]/10"
                      : "border-zinc-800 bg-[#131315] hover:border-zinc-700"
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      planId === plan.id ? "text-[#FACC15]" : "text-white"
                    }`}
                  >
                    {plan.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    ₱{plan.price.toLocaleString()}
                    {plan.durationDays ? ` · ${plan.durationDays} days` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || plans.length === 0}
          className="mt-8 w-full rounded-xl bg-[#FACC15] py-3.5 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#e6c200] disabled:opacity-60"
        >
          {submitting ? "Registering…" : "Register"}
        </button>
      </form>
    </div>
  );
}
