"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerLink,
  footerLinkText,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[420px] w-[420px] rounded-full bg-[#FFD700]/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="mb-6 flex items-center gap-2.5 transition hover:opacity-90">
            <Image
              src="/LOGO.png"
              alt="Fit Finder"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-contain"
              priority
            />
            <span className="text-xl font-bold tracking-wider">
              <span className="text-white">FIT</span>
              <span className="text-[#FFD700]"> FINDER</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141414]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-8">
          {children}
          <p className="mt-6 text-center text-sm text-zinc-400">
            {footerText}{" "}
            <Link
              href={footerLink}
              className="font-medium text-[#FFD700] transition hover:text-[#ffe44d]"
            >
              {footerLinkText}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
