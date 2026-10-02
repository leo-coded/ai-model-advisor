import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@strands-agents",
    "openai"
  ]
};

export default nextConfig;
