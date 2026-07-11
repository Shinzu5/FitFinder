"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerLink: string;
  footerLinkText: string;
}

export function AuthShell({ title, subtitle, children, footerText, footerLink, footerLinkText }: AuthShellProps) {
  return (
    <div className="relative min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 py-12 text-white selection:bg-[#FACC15] selection:text-black">
      {/* Background yellow/gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FACC15]/7 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[440px] flex flex-col gap-6 z-10">
        {/* Centered Header with Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20">
              <Dumbbell className="h-6 w-6 transform -rotate-45" />
            </div>
            <span className="text-2xl font-black tracking-wider uppercase">
              <span className="text-white">FIT</span>
              <span className="text-[#FACC15] ml-1">FINDER</span>
            </span>
          </Link>

          <div className="space-y-1.5 pt-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
            <p className="text-sm font-semibold text-zinc-500">{subtitle}</p>
          </div>
        </div>

        {/* Form Container Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-[24px] border border-zinc-800/60 bg-[#0b0b0d]/90 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-md"
        >
          {children}

          {/* Footer Text Inside Card */}
          <p className="mt-6 text-center text-xs font-semibold text-zinc-500">
            {footerText}{" "}
            <Link href={footerLink} className="text-[#FACC15] font-bold transition hover:text-[#e6c200] ml-0.5">
              {footerLinkText}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
