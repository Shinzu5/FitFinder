"use client";

import { OwnerHeader } from "./_components/OwnerHeader";
import { OwnerSidebar } from "./_components/OwnerSidebar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <OwnerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OwnerHeader />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
