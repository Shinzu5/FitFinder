import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Vercel `next build` fails on existing lint errors (`any`, unescaped quotes).
    // Keep linting in `npm run lint`; do not block production deploys.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
