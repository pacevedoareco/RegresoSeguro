import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const withPWA = withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Images: no external sources needed for MVP
  images: {
    remotePatterns: [],
  },
  // Allow @serwist/next webpack plugin to work alongside Turbopack
  turbopack: {},
};

export default withPWA(nextConfig);
