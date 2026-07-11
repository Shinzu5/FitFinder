import { Sparkles } from "lucide-react";

export default function CreateGymPlaceholderPage() {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-center shadow-[0_30px_90px_-45px_rgba(250,204,21,0.45)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 text-[#FACC15]">
        <Sparkles className="h-7 w-7" />
      </div>
      <p className="mt-5 text-sm uppercase tracking-[0.35em] text-[#FACC15]">Placeholder Route</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Create a Gym</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        This route is reserved for the gym creation flow and is intentionally kept lightweight for the frontend-only milestone.
      </p>
    </div>
  );
}
