import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js's own data caching ("Cache Components") is left off on purpose. The app
  // caches AlphaVantage responses itself (src/lib/alphavantage) because, with Next's
  // caching, an error thrown while caching fails the whole build, error details are
  // replaced by a generic message in production, and on Vercel the cache is emptied on
  // every deploy. Our own cache only stores successful responses and keeps every rule
  // visible in our code.

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
