"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const HERO_WORDS = ["Gyms", "Gym Owners", "Coaches", "Members"];

const STATS = [
  { value: "1,200+", label: "Active Gyms" },
  { value: "450k+", label: "Gym Members" },
  { value: "8,500+", label: "Coaches" },
  { value: "$12M+", label: "Transactions Processed" },
];

const FEATURES = [
  {
    title: "Gym Management",
    description:
      "Manage members, schedules, equipment, inventory, and staff from one dashboard.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    title: "AI Fitness Support",
    description:
      "An AI-powered assistant to help members reach their fitness goals faster.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "Walk-in & Online Payments",
    description:
      "Process walk-in, membership, class bookings, and store sales securely.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: "Coach Booking",
    description:
      "Seamless scheduling for personal training sessions and group classes.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Membership Plans",
    description:
      "Create flexible monthly, quarterly, and yearly plans with auto-renewals.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    title: "Exercise Plan",
    description:
      "Build and deliver personalized workout programs for every member.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
];

const ROLES = [
  {
    title: "Gym Owner",
    description: "Manage memberships, staff, revenue and gym settings",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    title: "Coach",
    description: "Schedule sessions, track clients, and grow your coaching business",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    title: "Gym Goer",
    description: "Browse gyms, join plans, book coaches and track progress",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    title: "Admin",
    description: "Oversee the entire ecosystem with powerful analytics",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    popular: false,
    features: [
      "Up to 50 members",
      "Basic gym management",
      "Member check-ins",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    popular: true,
    features: [
      "Unlimited members",
      "AI fitness assistant",
      "Online payments",
      "Coach booking",
      "Priority support",
    ],
  },
  {
    name: "Elite",
    price: "$149",
    period: "/mo",
    popular: false,
    features: [
      "Everything in Pro",
      "Multi-location support",
      "Advanced analytics",
      "Custom integrations",
      "Dedicated account manager",
    ],
  },
];

function LogoIcon() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#FFD700]">
      <svg className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    </div>
  );
}

function CheckIcon({ highlight = false }: { highlight?: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${highlight ? "text-[#FFD700]" : "text-zinc-500"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LandingPage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % HERO_WORDS.length);
        setFade(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-black/80 backdrop-blur-md">
        <nav className="relative mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 justify-self-start">
            <LogoIcon />
            <span className="text-lg font-bold tracking-wider">
              <span className="text-white">FIT</span>
              <span className="text-[#FFD700]"> FINDER</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-zinc-400 transition hover:text-white">
              Features
            </a>
            <a href="#solutions" className="text-sm text-zinc-400 transition hover:text-white">
              Solutions
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 transition hover:text-white">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-4 justify-self-end">
            <Link href="/login" className="hidden text-sm text-zinc-400 transition hover:text-white sm:block">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e6c200]"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative px-6 pb-16 pt-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#FFD700]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            The Operating System for
            <span
              className={`mx-auto mt-4 inline-block bg-[#FFD700] px-6 py-2 text-black transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
            >
              {HERO_WORDS[wordIndex]}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            A complete multi-tenant SaaS platform for gym owners, coaches, and members.
            Manage memberships, process walk-in payments, and leverage AI to grow your
            fitness business.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup?role=OWNER"
              className="flex items-center gap-2 rounded-lg bg-[#FFD700] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#e6c200]"
            >
              Start Your Gym
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/signup?role=USER"
              className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Find a Gym
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to scale</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Powerful tools designed to help gym owners, coaches, and members thrive
              in the modern fitness industry.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-zinc-800/80 bg-zinc-950 p-6 transition hover:border-[#FFD700]/30 hover:bg-zinc-900/50"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFD700]/10 text-[#FFD700]">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/20 bg-zinc-950 p-8 shadow-[0_0_60px_rgba(255,215,0,0.08)] md:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FFD700]/10 blur-3xl" />
            <div className="relative grid items-center gap-12 md:grid-cols-2">
              <div>
                <span className="mb-4 inline-block rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-1 text-xs font-semibold tracking-wider text-[#FFD700]">
                  AI POWERED
                </span>
                <h2 className="text-3xl font-bold sm:text-4xl">
                  Smarter fitness,
                  <br />
                  better results.
                </h2>
                <p className="mt-4 text-zinc-400">
                  Leverage AI-powered insights to personalize workouts, reduce churn,
                  and grow your gym with data-driven decisions.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Personalized AI Workout Plans",
                    "Smart Coach Recommendations",
                    "Churn Prediction for Owners",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFD700]/20 text-[#FFD700]">
                        <CheckIcon highlight />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center">
                <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD700]/20">
                      <svg className="h-5 w-5 text-[#FFD700]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Fit Finder AI Assistant</p>
                      <p className="text-xs text-zinc-500">Coach Recommendation</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-full rounded bg-zinc-800" />
                    <div className="h-3 w-4/5 rounded bg-zinc-800" />
                    <div className="h-3 w-3/5 rounded bg-zinc-800" />
                  </div>
                  <div className="mt-6 rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/5 p-4">
                    <p className="text-xs text-[#FFD700]">Coach Recommendation</p>
                    <p className="mt-1 text-sm font-medium">Upper Body Strength</p>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded bg-[#FFD700]/10 px-2 py-0.5 text-xs text-[#FFD700]">45 min</span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">6 exercises</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Built for everyone</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Whether you run a gym, coach clients, or manage operations ΓÇö Fit Finder
              has the tools you need.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <div
                key={role.title}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-6 text-center transition hover:border-zinc-700"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400">
                  {role.icon}
                </div>
                <h3 className="mb-2 font-semibold">{role.title}</h3>
                <p className="text-sm text-zinc-500">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-[#FFD700]/50 bg-zinc-950 shadow-[0_0_40px_rgba(255,215,0,0.08)]"
                    : "border-zinc-800 bg-zinc-950"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FFD700] px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-black">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-zinc-300">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-zinc-500">{plan.period}</span>
                  )}
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-zinc-400">
                      <CheckIcon highlight={plan.popular} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition ${
                    plan.popular
                      ? "bg-[#FFD700] text-black hover:bg-[#e6c200]"
                      : "border border-zinc-700 text-white hover:border-zinc-500 hover:bg-zinc-900"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-4">
            <div>
              <p className="text-lg font-bold tracking-wider">
                <span className="text-white">FIT</span>
                <span className="text-[#FFD700]"> FINDER</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                The complete operating system for modern fitness businesses.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#features" className="transition hover:text-white">Features</a></li>
                <li><a href="#pricing" className="transition hover:text-white">Pricing</a></li>
                <li><a href="#solutions" className="transition hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Account</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link href="/login" className="transition hover:text-white">Log in</Link></li>
                <li><Link href="/signup" className="transition hover:text-white">Sign up</Link></li>
                <li><a href="mailto:support@fitfinder.com" className="transition hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#" className="transition hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="transition hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-8 text-sm text-zinc-600 sm:flex-row">
            <p>&copy; 2026 Fit Finder. All rights reserved.</p>
            <p>Built by the team of Fit Finder</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
