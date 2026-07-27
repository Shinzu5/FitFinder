interface AdminPlaceholderPageProps {
  title: string;
  description: string;
}

export function AdminPlaceholderPage({ title, description }: AdminPlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-10 text-center">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-sm text-zinc-400">{description}</p>
    </div>
  );
}
