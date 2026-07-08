import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitfinder",
  description: "A Next.js app ready to run",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
