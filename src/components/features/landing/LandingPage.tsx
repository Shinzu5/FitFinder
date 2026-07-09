"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const HERO_WORDS = ["Gym Owners", "Coaches", "Members", "Fitness"];

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
    title: "Built-in Online Payments",
    description:
      "Process memberships, class bookings, and store sales securely.",
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
    title: "Combo Plan",
    description:
      "Offer bundled services with custom pricing and promotional discounts.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
];

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
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/LOGO.png"
              alt="Fit Finder logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-md object-cover"
              priority
            />
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
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-sm text-zinc-400 transition hover:text-white sm:block">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e6c200]"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative px-6 pb-16 pt-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#FFD700]/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            The Operating System for
            <span
              className={`mt-2 block text-[#FFD700] transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
            >
              {HERO_WORDS[wordIndex]}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            A complete SaaS platform for gym owners, coaches, and members — manage
            memberships, payouts with AI-powered insights, and leverage AI to grow
            your fitness business.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-lg bg-[#FFD700] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#e6c200]"
            >
                Start Your Gym
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-zinc-200 transition hover:text-white"
            >
              Explore demo login
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_0.6fr]">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-[#FFD700]">Featured benefits</p>
              <h2 className="mt-4 text-3xl font-semibold text-white">Everything your fitness team needs under one roof.</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                FitFinder combines membership management, billing, coaching, and front desk operations into a beautiful, easy-to-use platform.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#FACC15]/10 text-[#FACC15]">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-white">Why FitFinder?</h3>
            <div className="mt-6 space-y-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-3xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
