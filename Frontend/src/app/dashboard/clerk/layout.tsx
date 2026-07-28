"use client";

import { ClerkHeader } from "./_components/ClerkHeader";
import { ClerkSidebar } from "./_components/ClerkSidebar";

export default function ClerkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <ClerkSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClerkHeader />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
