"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Zap, 
  Sparkles, 
  CreditCard, 
  ShieldCheck, 
  User, 
  Dumbbell, 
  Activity, 
  Check, 
  ArrowRight,
  Menu,
  X,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HERO_WORDS = ["Gym Owners", "Coaches", "Members", "Fitness"];

const STATS = [
  { value: "1,200+", label: "Active Gyms" },
  { value: "450k+", label: "Gym Members" },
  { value: "8,500+", label: "Coaches" },
  { value: "$12M+", label: "Transactions Processed" },
];

const VALUE_PROPS = [
  {
    title: "Gym Management",
    description: "Manage multiple locations, equipment inventory, and staff schedules from one dashboard.",
    icon: <Zap className="h-5 w-5 text-lime-400" />,
    badgeColor: "bg-lime-500/10 border border-lime-500/20",
  },
  {
    title: "AI Fitness support",
    description: "Our AI analyzes member goals and pairs them with the perfect coach for maximum results.",
    icon: <Sparkles className="h-5 w-5 text-yellow-400" />,
    badgeColor: "bg-yellow-500/10 border border-yellow-500/20",
  },
  {
    title: "Walk-in & Online Payments",
    description: "Process memberships online via Xendit or handle walk-in cash/card payments at the front desk.",
    icon: <CreditCard className="h-5 w-5 text-orange-400" />,
    badgeColor: "bg-orange-500/10 border border-orange-500/20",
  },
];

const ROLES = [
  {
    title: "Gym Owner",
    description: "Manage memberships, staff, revenue, and gym settings.",
    icon: <ShieldCheck className="h-6 w-6 text-yellow-400" />,
  },
  {
    title: "Clerk",
    description: "Handle walk-ins, front desk payments, and member check-ins.",
    icon: <User className="h-6 w-6 text-zinc-400" />,
  },
  {
    title: "Gymer",
    description: "Browse gyms, join plans, book coaches, and track progress.",
    icon: <Dumbbell className="h-6 w-6 text-zinc-400" />,
  },
  {
    title: "Admin",
    description: "Platform oversight, gym approvals, and system analytics.",
    icon: <Activity className="h-6 w-6 text-zinc-400" />,
  },
];

const PRICING_PLANS = [
  {
    name: "Starter",
    description: "Perfect for new gyms just getting started.",
    price: "Free",
    features: [
      "1 Gym Location",
      "Up to 100 Members",
      "Basic Analytics",
      "Walk-in Payments",
    ],
    buttonText: "Get Started",
    isPopular: false,
  },
  {
    name: "Pro",
    description: "For growing fitness owners.",
    price: "$49",
    period: "/mo",
    features: [
      "Everything in Starter",
      "Unlimited Members",
      "Online Payments (Xendit)",
      "Coach Management",
      "AI Features",
    ],
    buttonText: "Get Started",
    isPopular: true,
  },
  {
    name: "Elite",
    description: "For established gym franchises.",
    price: "$149",
    period: "/mo",
    features: [
      "Multiple Locations",
      "Custom Domain",
      "Priority Support",
      "Advanced API Access",
      "Custom AI Models",
    ],
    buttonText: "Get Started",
    isPopular: false,
  },
];

export default function LandingPage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % HERO_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] font-sans text-white antialiased selection:bg-[#FACC15] selection:text-black">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[700px] w-full max-w-7xl -translate-x-1/2 overflow-hidden opacity-30">
        <div className="absolute top-[-200px] left-1/4 h-[600px] w-[600px] rounded-full bg-[#FACC15]/10 blur-[150px]" />
        <div className="absolute top-[-100px] right-1/4 h-[500px] w-[500px] rounded-full bg-yellow-600/5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-950 bg-black/60 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20">
              <Dumbbell className="h-5 w-5 transform -rotate-45" />
            </div>
            <span className="text-lg font-black tracking-wider">
              <span className="text-white">FIT</span>
              <span className="text-[#FACC15] ml-1">FINDER</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-zinc-400 transition hover:text-white">
              Features
            </a>
            <a href="#solutions" className="text-sm font-medium text-zinc-400 transition hover:text-white">
              Solutions
            </a>
            <a href="#pricing" className="text-sm font-medium text-zinc-400 transition hover:text-white">
              Pricing
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/login" className="text-sm font-semibold text-zinc-400 transition hover:text-white">
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#FACC15] px-4.5 py-2 text-sm font-bold text-black shadow-lg shadow-[#FACC15]/15 transition duration-200 hover:bg-[#e6c200] hover:scale-[1.02]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-zinc-900 bg-[#070708] px-6 py-4 md:hidden"
            >
              <div className="flex flex-col gap-4">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Features
                </a>
                <a
                  href="#solutions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Solutions
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Pricing
                </a>
                <hr className="border-zinc-800" />
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg bg-[#FACC15] py-2.5 text-sm font-bold text-black"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-20 text-center">
        <div className="mx-auto max-w-4xl">
          {/* Main Hero Header */}
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl flex flex-col items-center justify-center gap-3"
          >
            <span className="text-white">The Operating System for</span>
            {/* Styled Solid Yellow Block for Cycling Words */}
            <div className="relative mt-2 h-16 sm:h-24 min-w-[280px] sm:min-w-[450px] overflow-hidden rounded-xl bg-[#FACC15] flex items-center justify-center shadow-[0_10px_40px_rgba(250,204,21,0.2)]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-2xl sm:text-4xl lg:text-5xl font-black text-black tracking-wide uppercase px-6"
                >
                  {HERO_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            A complete multi-tenant SaaS platform for gym owners, coaches, and members.
            Manage memberships, process walk-in payments, and leverage AI to grow your fitness business.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-[#FACC15] px-6 py-3.5 text-sm font-bold text-black shadow-xl shadow-[#FACC15]/20 transition-all duration-200 hover:bg-[#e6c200] hover:scale-105"
            >
              Start Your Gym
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              href="#explore"
              className="rounded-xl border border-zinc-800 bg-[#0e0e11] px-6 py-3.5 text-sm font-bold text-zinc-300 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-white"
            >
              Find a Gym
            </Link>
          </motion.div>
        </div>

        {/* Stats Row Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mx-auto mt-20 max-w-5xl rounded-2xl border border-zinc-900/80 bg-zinc-950/45 p-6 backdrop-blur-md sm:p-8"
        >
          <div className="grid grid-cols-2 gap-y-8 gap-x-4 md:grid-cols-4 md:divide-x md:divide-zinc-900">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center px-4 text-center">
                <span className="text-3xl font-black text-white sm:text-4xl tracking-tight">
                  {stat.value}
                </span>
                <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Everything You Need to Scale Section */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
          >
            Everything you need to scale
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mx-auto mt-4 max-w-2xl text-zinc-400 text-sm sm:text-base"
          >
            Replace 5 different tools with one unified platform designed specifically for the fitness industry.
          </motion.p>
        </div>

        {/* 3-Column Value Props Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {VALUE_PROPS.map((prop, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="relative flex flex-col rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6.5 hover:border-zinc-800 transition-colors"
            >
              {/* Feature Icon Container */}
              <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl ${prop.badgeColor}`}>
                {prop.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{prop.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{prop.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Spotlight Section */}
      <section id="solutions" className="mx-auto max-w-6xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-yellow-500/10 bg-gradient-to-br from-zinc-950 via-[#070708] to-black p-8 md:p-14 shadow-[0_0_50px_rgba(250,204,21,0.02)]"
        >
          {/* Subtle Radial Glow */}
          <div className="absolute top-1/2 right-0 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-[#FACC15]/5 blur-[80px] pointer-events-none" />

          <div className="grid gap-12 lg:grid-cols-12 items-center">
            {/* Left Column: Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/20 px-3 py-1 text-xs font-semibold text-[#FACC15] tracking-wider uppercase">
                <Sparkles className="h-3 w-3" />
                Powered by AI
              </div>
              <h2 className="text-3xl font-extrabold sm:text-4xl text-white tracking-tight leading-tight">
                Smarter fitness, <br className="hidden sm:inline" />
                better results.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-zinc-400">
                GymOS leverages advanced AI to provide personalized workout recommendations, smart coach matching, and predictive analytics for gym owners to reduce churn.
              </p>

              {/* Bullet Features Checklist */}
              <ul className="space-y-3.5 pt-2">
                {[
                  "Personalized AI Workout Plans",
                  "Smart Coach Recommendations",
                  "Churn Prediction for Owners",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-zinc-200">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-black">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: AI Coach Match Box */}
            <div className="lg:col-span-6 flex justify-center">
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-[420px] rounded-2xl border border-zinc-900 bg-black/60 p-6 shadow-2xl shadow-black/80 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400/10 text-[#FACC15]">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Coach Match</h4>
                      <p className="text-[11px] text-zinc-500 font-medium italic animate-pulse">
                        Analyzing member profile...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulated Wave Lines / Loading */}
                <div className="mt-5 space-y-2.5">
                  <div className="h-2 w-3/4 rounded-full bg-zinc-900" />
                  <div className="h-2 w-5/6 rounded-full bg-zinc-900" />
                  <div className="h-2 w-1/2 rounded-full bg-zinc-900" />
                </div>

                {/* Match Highlight Box */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 rounded-xl bg-[#FACC15] p-4 text-black shadow-lg shadow-[#FACC15]/10"
                >
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-black/65">
                    Match Found: Coach Sarah
                  </span>
                  <p className="mt-1 text-xs font-bold leading-relaxed">
                    99% match based on your goal: Weight Loss & Cardio
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Built For Everyone Section */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built for everyone
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400 text-sm">
            A unified platform with specialized dashboards for every role in your fitness business.
          </p>
        </div>

        {/* 4-Card Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className="flex flex-col items-center text-center rounded-2xl border border-zinc-900 bg-zinc-950/20 p-6 hover:border-zinc-800 hover:bg-zinc-900/10 transition-all duration-200"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900/60 border border-zinc-800/80 shadow-md">
                {role.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{role.title}</h3>
              <p className="text-xs leading-relaxed text-zinc-500 font-medium">
                {role.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-400 text-sm">
            Start for free, upgrade when you need more power.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 lg:items-stretch">
          {PRICING_PLANS.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`relative flex flex-col justify-between rounded-3xl p-8 border ${
                plan.isPopular
                  ? "border-[#FACC15] bg-[#09090b] shadow-[0_15px_40px_rgba(250,204,21,0.07)]"
                  : "border-zinc-900 bg-zinc-950/30"
              }`}
            >
              {/* Most Popular Badge */}
              {plan.isPopular && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FACC15] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-black shadow-lg">
                  Most Popular
                </div>
              )}

              <div>
                {/* Plan Header */}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-2 text-xs text-zinc-500 font-semibold">{plan.description}</p>

                {/* Price */}
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white tracking-tight">{plan.price}</span>
                  {plan.period && <span className="text-sm font-semibold text-zinc-500">{plan.period}</span>}
                </div>

                {/* Features Divider */}
                <hr className="my-6 border-zinc-900" />

                {/* Features List */}
                <ul className="space-y-3">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-xs text-zinc-300">
                      <Check
                        className={`h-4 w-4 shrink-0 stroke-[2.5] ${
                          plan.isPopular ? "text-[#FACC15]" : "text-zinc-500"
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8">
                <Link
                  href="/signup"
                  className={`block w-full py-2.5 rounded-xl text-center text-xs font-bold transition duration-200 ${
                    plan.isPopular
                      ? "bg-[#FACC15] hover:bg-[#e6c200] text-black shadow-lg shadow-[#FACC15]/10"
                      : "bg-[#141416] hover:bg-[#1f1f23] text-zinc-300 hover:text-white border border-zinc-800"
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-950 bg-black pt-16 pb-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-4">
            {/* Branding Column */}
            <div className="space-y-4 md:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FACC15] text-black shadow-sm">
                  <Dumbbell className="h-4 w-4 transform -rotate-45" />
                </div>
                <span className="text-sm font-black tracking-wider">
                  <span className="text-white">FIT</span>
                  <span className="text-[#FACC15] ml-1">FINDER</span>
                </span>
              </Link>
              <p className="max-w-xs text-xs font-semibold leading-relaxed text-zinc-600">
                The modern operating system for fitness businesses.
              </p>
            </div>

            {/* Links Columns */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Product</h4>
              <ul className="space-y-2">
                {["Features", "Pricing", "AI Coach"].map((item, idx) => (
                  <li key={idx}>
                    <a href={`#${item.toLowerCase().replace(" ", "")}`} className="text-xs text-zinc-500 transition hover:text-white">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Contact Support</h4>
              <p className="text-xs text-zinc-500 font-semibold">fitfinder@gmail.com</p>
              
              <div className="pt-2 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Legal</h4>
                <ul className="space-y-2">
                  {["Privacy Policy", "Terms of Service"].map((item, idx) => (
                    <li key={idx}>
                      <Link href={`/${item.toLowerCase().replace(" ", "-")}`} className="text-xs text-zinc-500 transition hover:text-white">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-zinc-950 pt-8 sm:flex-row text-[11px] font-semibold text-zinc-600">
            <span>© 2026 GymOS Platform. All rights reserved.</span>
            <span>Built for the future of fitness.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
