"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Dumbbell,
  Globe,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { mockGyms } from "@/stores/dashboard-store";

/* ─── Mock per-gym enriched data ──────────────────────────────────────── */
const GYM_META: Record<
  string,
  {
    rating: number;
    reviewCount: number;
    phone: string;
    website: string;
    ownerName: string;
    ownerTitle: string;
    ownerBio: string;
    ownerAvatar: string;
    hours: string;
    openTime: string;
    closeTime: string;
    coaches: { name: string; specialty: string; avatar: string }[];
    plans: {
      name: string;
      price: number;
      period: string;
      duration: string;
      perks: string[];
      popular?: boolean;
    }[];
  }
> = {
  default: {
    rating: 4.7,
    reviewCount: 142,
    phone: "0917 123 4567",
    website: "abbsy.gym",
    ownerName: "Renz Aballe",
    ownerTitle: "Gym Owner",
    ownerBio:
      "Powerlifter and coach for 12 years. I built this gym to make serious strength training accessible to my community.",
    ownerAvatar:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=200&q=80",
    hours: "Mon-Sun: 6AM - 10PM",
    openTime: "6:00 AM",
    closeTime: "10:00 PM",
    coaches: [
      {
        name: "Renz Aballe",
        specialty: "Strength & Powerlifting",
        avatar:
          "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Maria Santos",
        specialty: "HIIT & Conditioning",
        avatar:
          "https://images.unsplash.com/photo-1593223616042-87b9d5568be8?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Jake Reyes",
        specialty: "Mobility & Recovery",
        avatar:
          "https://images.unsplash.com/photo-1529516548873-9ce57c8f155e?auto=format&fit=crop&w=200&q=80",
      },
    ],
    plans: [
      {
        name: "Monthly",
        price: 799,
        period: "/mo",
        duration: "30 days access",
        perks: ["Full Gym Access", "Locker Room"],
      },
      {
        name: "Quarterly",
        price: 2100,
        period: "/mo",
        duration: "90 days access",
        perks: ["Full Gym Access", "1 Free PT Session"],
        popular: true,
      },
      {
        name: "Annual",
        price: 7499,
        period: "/yr",
        duration: "365 days access",
        perks: ["Full Gym Access", "3 Free PT Sessions", "20% off shop"],
      },
    ],
  },
};

function getMeta(slug: string) {
  return GYM_META[slug] ?? GYM_META["default"];
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function GymDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const gym = mockGyms.find((g) => g.slug === slug);
  const meta = getMeta(slug);

  if (!gym) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0e0e10] p-10 text-center shadow-2xl">
          <Dumbbell className="mx-auto h-10 w-10 text-[#FACC15] mb-4" />
          <h1 className="text-2xl font-bold text-white">Gym Not Found</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This gym doesn&apos;t exist or is no longer available.
          </p>
          <Link
            href="/dashboard/user"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#e6c200] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div className="relative h-[380px] w-full overflow-hidden">
        <Image
          src={gym.image}
          alt={gym.name}
          fill
          className="object-cover"
          priority
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#050505]" />

        {/* Back button */}
        <div className="absolute top-5 left-5">
          <Link
            href="/dashboard/user"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur-md text-white transition hover:bg-black/70"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Rating + Location badges */}
        <div className="absolute bottom-24 left-5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <Star className="h-3 w-3 fill-[#FACC15] text-[#FACC15]" />
            {meta.rating} ({meta.reviewCount} reviews)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <MapPin className="h-3 w-3 text-white" />
            {gym.location}
          </span>
        </div>

        {/* Gym name + Visit Website */}
        <div className="absolute bottom-6 left-5 right-5 flex items-end justify-between">
          <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">
            {gym.name}
          </h1>
          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-full border border-[#FACC15]/60 bg-[#FACC15]/10 px-4 py-2 text-sm font-bold text-[#FACC15] backdrop-blur-md transition hover:bg-[#FACC15]/20"
          >
            <Globe className="h-4 w-4" />
            Visit Website
          </Link>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-4 space-y-10 lg:px-8">
        {/* ── OWNER CARD ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-5"
        >
          {/* Avatar + OWNER badge */}
          <div className="relative shrink-0 self-start sm:self-center">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-zinc-700">
              <Image
                src={meta.ownerAvatar}
                alt={meta.ownerName}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#FACC15] px-2 py-0.5 text-[9px] font-black text-black uppercase tracking-widest">
              OWNER
            </span>
          </div>

          {/* Owner Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-xs font-semibold text-[#FACC15] uppercase tracking-wider">
              {meta.ownerTitle}
            </p>
            <p className="text-lg font-bold text-white">{meta.ownerName}</p>
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
              {meta.ownerBio}
            </p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#FACC15]/40 bg-[#FACC15]/10 px-3 py-1.5 text-xs font-bold text-[#FACC15] transition hover:bg-[#FACC15]/20"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Message Owner
            </button>
          </div>

          {/* Hours (right side) */}
          <div className="shrink-0 rounded-xl border border-zinc-800/60 bg-[#131315] px-4 py-3 space-y-1.5 min-w-[180px]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#FACC15]">
              <Clock className="h-3.5 w-3.5" />
              Hours
            </div>
            <p className="text-sm font-semibold text-white">{meta.hours}</p>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-0.5">
              <span>
                Open:{" "}
                <span className="font-semibold text-emerald-400">
                  {meta.openTime}
                </span>
              </span>
              <span>
                Close:{" "}
                <span className="font-semibold text-red-400">
                  {meta.closeTime}
                </span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── ABOUT ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <h2 className="text-xl font-bold text-white mb-2">
            About {gym.name}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            {gym.description}
          </p>
        </motion.section>

        {/* ── MEMBERSHIP PLANS ───────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/10">
              <Users className="h-4.5 w-4.5 text-[#FACC15]" />
            </div>
            <h2 className="text-xl font-bold text-white">Membership Plans</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Plan cards */}
            {meta.plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${
                  plan.popular
                    ? "border-[#FACC15]/50 bg-[#111108]"
                    : "border-zinc-800/70 bg-[#0e0e10]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#FACC15] px-3 py-0.5 text-[10px] font-black text-black uppercase tracking-wider">
                      POPULAR
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-white">{plan.name}</p>
                  <div className="mt-2 flex items-baseline gap-0.5">
                    <span className="text-xs text-zinc-500 mr-0.5">₱</span>
                    <span className="text-2xl font-extrabold text-white">
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500">{plan.period}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {plan.duration}
                  </p>
                </div>

                <ul className="space-y-1.5 flex-1">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`w-full rounded-xl py-2.5 text-sm font-bold transition ${
                    plan.popular
                      ? "bg-[#FACC15] text-black hover:bg-[#e6c200]"
                      : "border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  Select Plan
                </button>
              </div>
            ))}

            {/* Contact Card */}
            <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5 flex flex-col gap-4">
              <p className="text-sm font-bold text-white">Contact</p>

              <ul className="space-y-2.5 flex-1">
                <li className="flex items-center gap-2 text-xs text-zinc-400">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" />
                  {meta.phone}
                </li>
                <li className="flex items-center gap-2 text-xs text-zinc-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" />
                  {gym.location}
                </li>
                <li className="flex items-center gap-2 text-xs text-zinc-400">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" />
                  {meta.hours}
                </li>
                <li className="flex items-center gap-2 text-xs text-zinc-400">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-[#FACC15]" />
                  {meta.website}
                </li>
              </ul>

              <button
                type="button"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Message Owner
              </button>
            </div>
          </div>
        </motion.section>

        {/* ── EXPERT COACHES ─────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/10">
              <Users className="h-4.5 w-4.5 text-[#FACC15]" />
            </div>
            <h2 className="text-xl font-bold text-white">Expert Coaches</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meta.coaches.map((coach) => (
              <div
                key={coach.name}
                className="flex items-center gap-4 rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-4"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-zinc-700">
                  <Image
                    src={coach.avatar}
                    alt={coach.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{coach.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {coach.specialty}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
