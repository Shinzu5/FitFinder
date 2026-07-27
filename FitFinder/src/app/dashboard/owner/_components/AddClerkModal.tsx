"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOwnerStaffStore } from "@/stores/owner-staff-store";

interface AddClerkModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddClerkModal({ open, onClose }: AddClerkModalProps) {
  const addClerk = useOwnerStaffStore((state) => state.addClerk);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setEmail("");
    setPassword("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const ok = addClerk({ fullName, email });
    if (!ok) {
      setError("A clerk with this email already exists.");
      return;
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Clerk</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clerkName">Full Name</Label>
            <Input
              id="clerkName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clerkEmail">Email Address</Label>
            <Input
              id="clerkEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clerkPassword">Password</Label>
            <Input
              id="clerkPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#FFD700]/50 px-4 py-2 text-sm font-medium text-[#FFD700] transition hover:bg-[#FFD700]/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            Add Clerk
          </button>
        </div>
      </form>
    </div>
  );
}
