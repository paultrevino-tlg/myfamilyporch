import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;

// Required by the Cloudflare adapter for local dev bindings (next dev only).
// Guarded so it does NOT run inside `next build` worker threads, where
// concurrent workerd starts crash on Windows (std::terminate).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
