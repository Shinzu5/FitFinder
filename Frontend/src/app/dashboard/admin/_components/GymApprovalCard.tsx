"use client";

import { MapPin } from "lucide-react";
import {
  formatSubmittedDate,
  type GymApplication,
} from "@/stores/admin-gym-approvals-store";

interface GymApprovalCardProps {
  application: GymApplication;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function GymApprovalCard({ application, onApprove, onReject }: GymApprovalCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
      <div className="flex flex-col gap-5 p-5 lg:flex-row">
        <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-900 lg:h-40 lg:w-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={application.imageUrl}
            alt={application.gymName}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-2xl font-bold text-white">{application.gymName}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
                    <MapPin className="h-4 w-4 shrink-0 text-zinc-500" />
                    {application.location}
                  </p>
                </div>

                <div className="shrink-0 space-y-1 text-right text-xs text-zinc-500">
                  <p>
                    Website/link/Slug:{" "}
                    <span className="text-zinc-300">{application.websiteSlug}</span>
                  </p>
                  <p>
                    Api key: <span className="font-mono text-zinc-300">{application.apiKey}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#FACC15]/35 bg-[#FACC15]/15 px-3 py-1 text-xs font-semibold text-[#FACC15]">
                  {application.planName}
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Paid ₱{application.planPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => onReject(application.id)}
                className="rounded-xl border border-red-500/60 px-5 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => onApprove(application.id)}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-400"
              >
                Approve Gym
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800/70 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Owner", value: application.ownerName },
                { label: "Email", value: application.ownerEmail },
                { label: "Contact", value: application.contactNumber },
                { label: "Submitted", value: formatSubmittedDate(application.submittedAt) },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs text-zinc-500">{field.label}</p>
                  <p className="mt-1 text-sm font-medium text-white">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
