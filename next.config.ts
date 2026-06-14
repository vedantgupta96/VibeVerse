import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Deezer serves artwork/artist images from its CDN.
    remotePatterns: [
      { protocol: "https", hostname: "**.dzcdn.net" },
      { protocol: "https", hostname: "**.deezer.com" },
    ],
  },
};

export default nextConfig;
