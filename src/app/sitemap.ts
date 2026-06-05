import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// XML sitemap (Phase 8.10, brief §8) — served at /sitemap.xml via the Next App
// Router convention. Lists ONLY the public marketing pages; private surfaces
// (the app dashboard, auth, the token-scoped storyteller/play routes) are
// intentionally excluded and also disallowed in robots.ts. Statically generated
// at build time. lastModified is stamped at build so the dates are stable.
//
// Keep this list in sync when adding a public marketing page.
const PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/gift", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
