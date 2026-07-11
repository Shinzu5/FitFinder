"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  Dumbbell,
  Globe,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  Target,
  Users,
} from "lucide-react";
import type { PublicGymProfile } from "../_lib/gym-profile";
import { getWebsiteHref } from "../_lib/gym-profile";
import { useMembershipStore } from "@/stores/membership-store";

interface GymProfileViewProps {
  profile: PublicGymProfile;
}

export function GymProfileView({ profile }: GymProfileViewProps) {
  const router = useRouter();
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const isJoined = joinedGymId === profile.id;

  function handleJoin() {
    router.push(`/dashboard/user/gym/${profile.id}/join`);
  }

  return (
    <div className="relative min-h-screen pb-28">
      <section className="relative min-h-[380px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.image}
          alt={profile.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />

        <button
          type="button"
          onClick={() => router.push("/dashboard/user")}
          className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 pb-8 pt-16 lg:px-8">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 text-[#FFD700]">
                <Star className="h-4 w-4 fill-[#FFD700]" />
                {profile.rating} ({profile.reviewCount} reviews)
              </span>
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <MapPin className="h-4 w-4 text-[#FFD700]" />
                {profile.location}
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                {profile.name}
              </h1>
              <a
                href={getWebsiteHref(profile.website)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFD700]/50 bg-black/30 px-4 py-2 text-sm font-medium text-[#FFD700] backdrop-blur-sm transition hover:bg-[#FFD700]/10"
              >
                <Globe className="h-4 w-4" />
                Visit Website
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-8 lg:px-8">
        <section className="-mt-6 rounded-2xl border border-white/10 bg-[#141414] p-5 md:p-6 lg:-mt-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.owner.avatarUrl}
                  alt={profile.owner.name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-[#FFD700]/30"
                />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#FFD700] px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                  Owner
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-white">{profile.owner.name}</h2>
                <p className="text-sm font-medium text-[#FFD700]">Gym Owner</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  {profile.owner.bio}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e6c200]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message Owner
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-white">
                <Clock className="h-4 w-4 text-[#FFD700]" />
                Hours
              </p>
              <p className="mt-2 text-zinc-400">{profile.hours}</p>
              <p className="mt-2 text-zinc-400">
                Open: <span className="text-[#FFD700]">{profile.openTime}</span>
              </p>
              <p className="text-zinc-400">
                Close: <span className="text-[#FFD700]">{profile.closeTime}</span>
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white">About {profile.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
            {profile.description}
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
            <Target className="h-6 w-6 text-[#FFD700]" />
            Membership Plans
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {profile.plans.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-[#141414] p-5 ${
                  plan.popular ? "border-[#FFD700]" : "border-white/10"
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 left-4 rounded bg-[#FFD700] px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                    Popular
                  </span>
                ) : null}
                <h3 className="font-semibold text-white">{plan.name}</h3>
                <p className="mt-3 text-2xl font-bold text-[#FFD700]">
                  ₱{plan.price.toLocaleString()}
                  <span className="text-sm font-medium text-zinc-500">{plan.periodLabel}</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">{plan.durationLabel}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-400">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-[#FFD700]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-5 w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    plan.popular
                      ? "bg-[#FFD700] text-black hover:bg-[#e6c200]"
                      : "border border-white/15 bg-transparent text-zinc-300 hover:border-[#FFD700]/40 hover:text-[#FFD700]"
                  }`}
                >
                  Select Plan
                </button>
              </article>
            ))}

            <article className="flex flex-col rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h3 className="font-semibold text-white">Contact</h3>
              <ul className="mt-4 flex-1 space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[#FFD700]" />
                  {profile.phone}
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FFD700]" />
                  {profile.location}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-[#FFD700]" />
                  {profile.hours}
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-[#FFD700]" />
                  {profile.socialHandle}
                </li>
              </ul>
              <button
                type="button"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-[#FFD700]/40 hover:text-[#FFD700]"
              >
                <MessageSquare className="h-4 w-4" />
                Message Owner
              </button>
            </article>
          </div>
        </section>

        {profile.coaches.length > 0 ? (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
              <Users className="h-6 w-6 text-[#FFD700]" />
              Expert Coaches
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {profile.coaches.map((coach) => (
                <article
                  key={coach.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#141414] p-4"
                >
                  {coach.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coach.photoUrl}
                      alt={coach.name}
                      className="h-16 w-16 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/20 text-lg font-semibold text-[#FFD700]">
                      {coach.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">{coach.name}</h3>
                    <p className="text-sm text-zinc-500">{coach.specialty}</p>
                    <p className="mt-1 text-sm font-bold text-[#FFD700]">
                      ₱{coach.sessionPrice.toLocaleString()}/hr
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-[#FFD700]/40 px-3 py-2 text-xs font-semibold text-[#FFD700] transition hover:bg-[#FFD700]/10"
                  >
                    Book
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {profile.equipment.length > 0 ? (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
              <Dumbbell className="h-6 w-6 text-[#FFD700]" />
              Equipment &amp; Facilities
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.equipment.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-[#141414] px-4 py-2 text-sm text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-end px-6 py-4 lg:px-8">
          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoined}
            className={`rounded-xl px-8 py-3 text-sm font-bold transition ${
              isJoined
                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "bg-[#FFD700] text-black hover:bg-[#e6c200]"
            }`}
          >
            {isJoined ? "Joined" : "Join This Gym"}
          </button>
        </div>
      </div>
    </div>
  );
}
