"use client";

export function OwnerPlaceholderPage({ description }: { description: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}
