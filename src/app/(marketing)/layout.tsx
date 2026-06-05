import { SiteHeader } from "./_components/SiteHeader";
import { SiteFooter } from "./_components/SiteFooter";

// The single shell wrapping every public marketing page (Phase 8.1): a
// skip-to-content link, the sticky header, the page's <main>, and the footer.
// Nested under the root layout, so it only affects the (marketing) route group
// — the (app) and (storyteller) groups are untouched. Pages render their own
// content (no nested <main>), inheriting the shared header/footer + SEO base.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
