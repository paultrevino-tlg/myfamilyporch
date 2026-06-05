import type { JsonLdObject } from "@/lib/jsonld";

// Renders a schema.org JSON-LD object as a <script type="application/ld+json">
// (Phase 8.10). Server component, no JS island — the script is emitted in the
// prerendered HTML. JSON.stringify safely escapes the content; data comes only
// from our own typed sources (lib/seo, lib/pricing), never user input.
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
