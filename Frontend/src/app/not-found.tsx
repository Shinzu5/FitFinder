import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
      <h1 className="text-6xl font-extrabold text-[#FFD700]">404</h1>
      <h2 className="mt-4 text-2xl font-bold">Page Not Found</h2>
      <p className="mt-2 text-zinc-400">The page you are looking for does not exist or has been moved.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-[#FFD700] px-6 py-3 text-sm font-bold uppercase text-black transition hover:bg-[#e6c200]"
      >
        Return Home
      </Link>
    </div>
  );
}
