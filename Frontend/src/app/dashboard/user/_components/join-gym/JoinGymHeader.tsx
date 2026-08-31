"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface JoinGymHeaderProps {
  title: string;
  backHref?: string;
  onBack?: () => void;
}

export function JoinGymHeader({ title, backHref, onBack }: JoinGymHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  }

  return (
    <header className="flex items-center gap-4 border-b border-white/10 px-4 py-4">
      <button
        type="button"
        onClick={handleBack}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/5"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-base font-semibold text-white">{title}</h1>
    </header>
  );
}
