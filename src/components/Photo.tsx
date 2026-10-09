// Responsive Porchlight photograph, shared by the marketing site and the app.
// Plain <img> (no next/image optimizer on the Workers deploy); the browser picks
// the smallest pre-sized WebP that fills the slot, so a phone pulls the 640/1280
// file instead of the 1920. Files live in public/images/porchlight as
// `${name}-${width}.webp` (generated with sharp from the CreativeClaw
// originals, 4x-upscaled so the 1920 cut stays sharp).
import type { CSSProperties } from "react";

const WIDTHS = [640, 1280, 1920] as const;

export type PhotoName =
  | "porch"
  | "storyteller"
  | "book"
  | "phone"
  | "hands"
  | "gift"
  | "chairs"
  | "porchlight";

// Default alt text per photograph, so every page describes the same image the
// same way; pass `alt` only when a page needs a different emphasis.
export const PHOTO_ALT: Record<PhotoName, string> = {
  porch: "Late afternoon sun across a weathered porch railing and an empty wicker rocking chair.",
  storyteller: "An older man on a porch step in golden light, phone in hand, mid-story.",
  book: "A printed hardcover book of family stories open on an oak table in late sun, voice QR codes in the margins.",
  phone: "An older woman's hands holding a simple phone at a worn kitchen table in low golden light, a cup of coffee beside her.",
  hands: "A grandparent's hand resting over a grandchild's small hand on a weathered porch railing at dusk.",
  gift: "A hardcover book wrapped in kraft paper and twine on a weathered porch table beside a wicker chair, in late golden light.",
  chairs: "Two empty wicker rocking chairs on a sunlit front porch, a knit blanket over one arm.",
  porchlight: "A warm porch light glowing beside an open front door at dusk.",
};

export function Photo({
  name,
  alt,
  sizes = "100vw",
  priority = false,
  className = "",
  style,
}: {
  name: PhotoName;
  alt?: string;
  sizes?: string;
  // The hero is the page's largest paint: load it first, never lazily.
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const src = (w: number) => `/images/porchlight/${name}-${w}.webp`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src(1280)}
      srcSet={WIDTHS.map((w) => `${src(w)} ${w}w`).join(", ")}
      sizes={sizes}
      alt={alt ?? PHOTO_ALT[name]}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
      style={style}
    />
  );
}
