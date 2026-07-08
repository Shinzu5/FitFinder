export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Fitfinder</h1>
      <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
        Your Next.js app is running. Edit{" "}
        <code className="rounded bg-zinc-100 px-2 py-1 text-sm dark:bg-zinc-800">
          src/app/page.tsx
        </code>{" "}
        to get started.
      </p>
      <a
        href="https://nextjs.org/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Read the docs
      </a>
    </main>
  );
}
