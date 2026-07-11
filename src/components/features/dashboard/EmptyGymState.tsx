"use client";

import { RefreshCcw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyGymStateProps {
  onRefresh: () => void;
}

export function EmptyGymState({ onRefresh }: EmptyGymStateProps) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-10 text-center shadow-[0_30px_90px_-45px_rgba(250,204,21,0.45)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 text-[#FACC15]">
        <SearchX className="h-9 w-9" />
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-white">No Gyms Found</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
        There are no gyms available right now. Check back soon, and we’ll have fresh options ready for you.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={onRefresh} className="gap-2" variant="secondary">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </section>
  );
}
