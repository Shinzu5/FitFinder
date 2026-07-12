"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, LogOut, UserCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { ChangePasswordModal } from "@/app/dashboard/owner/_components/ChangePasswordModal";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function ProfileAvatar({ name }: { name: string }) {
  return <UserCircle2 className="h-5 w-5 text-[#FFD700]" aria-label={name} />;
}

export function ClerkProfileMenu() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName ?? "Clerk";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSignOut() {
    setOpen(false);
    logout();
    router.replace("/login");
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 transition hover:border-[#FFD700]/30"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#FFD700]/20">
            <ProfileAvatar name={displayName} />
          </div>
          <span className="text-sm font-medium">{displayName}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open ? (
          <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl">
            <div className="border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/20">
                  <UserCircle2 className="h-7 w-7 text-[#FFD700]" />
                </div>
                <div>
                  <p className="font-semibold text-white">{displayName}</p>
                  <p className="text-sm text-zinc-500">Front Desk Clerk</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPasswordModalOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white transition hover:bg-white/5"
              >
                <KeyRound className="h-4 w-4 text-zinc-400" />
                Change password
              </button>
            </div>

            <div className="border-t border-white/10 p-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white transition hover:bg-white/5"
              >
                <LogOut className="h-4 w-4 text-zinc-400" />
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </>
  );
}
