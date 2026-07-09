"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.22),_transparent_35%),_#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <Link href="/" className="flex items-center gap-3 text-sm text-zinc-300 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="flex justify-center">
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="rounded-[2rem] border border-white/10 bg-[#0F0F10]/90 p-6 shadow-[0_20px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8 w-full sm:max-w-md">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
            </div>
            {children}
            <p className="mt-6 text-center text-sm text-zinc-400">
              {footerText}{" "}
              <Link href={footerLink} className="font-medium text-[#FACC15] transition hover:text-[#fde68a]">
                {footerLinkText}
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
