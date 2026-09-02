"use client";

import { useState } from "react";
import { useClerkMembershipPlansSync } from "@/hooks/useClerkMembershipPlansSync";
import { ClerkHeader } from "./_components/ClerkHeader";
import { ClerkSidebar } from "./_components/ClerkSidebar";

export default function ClerkLayout({ children }: { children: React.ReactNode }) {
  useClerkMembershipPlansSync();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white md:flex-row">
      <ClerkSidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClerkHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
