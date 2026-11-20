import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev compiler cache isolated from production servers. Sharing
  // `.next` lets a running `next start` serve an old HTML manifest with a
  // newer dev asset graph, which produces 400s for every client bundle.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
