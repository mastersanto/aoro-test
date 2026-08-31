import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A lockfile above this directory makes the inferred workspace root ambiguous;
  // pin it to this project so builds are reproducible wherever they run.
  turbopack: { root: __dirname },
};

export default nextConfig;
