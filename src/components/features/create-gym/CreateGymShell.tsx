"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Plan" },
  { id: 2, label: "Payment" },
  { id: 3, label: "Done" },
] as const;

interface CreateGymShellProps {
  step: 1 | 2 | 3;
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}

export function CreateGymShell({
  step,
  backHref,
  backLabel,
  children,
}: CreateGymShellProps) {
  return (
    <div className="min-h-screen bg-black px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15">
              <ArrowLeft className="h-4 w-4" />
            </span>
            {backLabel}
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/LOGO.png"
              alt="Fit Finder"
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-contain"
            />
            <span className="text-sm font-bold tracking-wider">
              <span className="text-white">FIT</span>
              <span className="text-[#FFD700]"> FINDER</span>
            </span>
          </Link>
        </div>

        <div className="mb-10 flex items-center justify-center">
          <div className="flex w-full max-w-md items-center">
            {STEPS.map((item, index) => {
              const complete = step > item.id;
              const active = step === item.id;
              const reached = complete || active;

              return (
                <div key={item.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                        reached
                          ? "border-[#FFD700] bg-[#FFD700] text-black"
                          : "border-zinc-600 text-zinc-500"
                      }`}
                    >
                      {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : item.id}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        reached ? "text-[#FFD700]" : "text-zinc-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <div
                      className={`mx-3 mb-6 h-px flex-1 ${
                        step > item.id ? "bg-[#FFD700]" : "bg-zinc-700"
                      }`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
