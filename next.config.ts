import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Memoizes components automatically, so the profile panel and earlier
  // answers don't re-render on every streamed token.
  reactCompiler: true,
  experimental: {
    turbopackRustReactCompiler: true,
  },
};

export default nextConfig;
