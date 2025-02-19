import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    appDir: true,
  } as any, // temporarily bypass type checking for experimental options
};

export default nextConfig;
