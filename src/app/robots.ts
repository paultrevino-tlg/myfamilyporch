import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// robots.txt (Phase 8.10, brief §8) — served at /robots.txt via the Next App
// Router convention. Crawlers may index the public marketing pages; everything
// private is disallowed: the API, the authenticated app dashboard, the
// token-scoped storyteller flow (/s/) and public play pages (/p/, already
// noindex), and the auth/onboarding/checkout seams. References the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/storytellers",
        "/settings",
        "/schedule",
        "/topics",
        "/stories",
        "/book",
        "/onboarding",
        "/invite",
        "/s/",
        "/p/",
        "/auth",
        "/login",
        "/signup",
      ],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
    host: SITE_URL,
  };
}
