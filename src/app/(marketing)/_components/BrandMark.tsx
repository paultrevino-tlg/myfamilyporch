// Brand mark (Phase 8.9): the rocking-chair-on-the-porch logo — the spot where
// the family gathers and the stories get told. Inline SVG in the blue brand
// gradient so it's crisp at any size and inherits no raster weight. Replaces the
// 🏡 emoji that stood in across the marketing shell (header, footer, hero).
//
// The same artwork is the source for the favicon/PWA/OG rasters
// (assets/brand/icon.svg → scripts/gen-icons.mjs). Keep them in sync.

type BrandMarkProps = {
  /** Tailwind sizing/extra classes for the tile (default h-9 w-9). */
  className?: string;
};

// A single shared gradient id is fine even with multiple instances on a page:
// SVG resolves all references to the first definition.
export function BrandMark({ className = "h-9 w-9" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="mfpMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#mfpMark)" />
      {/* porch roof eave */}
      <path
        d="M13 20 L32 11 L51 20"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.92"
      />
      {/* porch floor */}
      <line
        x1="14"
        y1="51"
        x2="50"
        y2="51"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* rocking chair (side view) */}
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 48 Q32 55 47 47" />
        <path d="M24 48 L26 37 L24 22" />
        <path d="M29 37 L28 23" />
        <path d="M24 22 Q26 19 28 23" />
        <path d="M26 37 L41 37" />
        <path d="M41 37 L44 48" />
        <path d="M25 29 L41 31" />
        <path d="M41 31 L41 37" />
      </g>
    </svg>
  );
}
