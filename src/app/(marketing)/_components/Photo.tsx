// Responsive Porchlight photograph. Plain <img> (no next/image optimizer on the
// Workers deploy); the browser picks the smallest pre-sized WebP that fills the
// slot, so a phone pulls the 640/1280 file instead of the 1920. Files live in
// public/images/porchlight as `${name}-${width}.webp` (generated with sharp from
// the CreativeClaw originals, 4x-upscaled so the 1920 cut stays sharp).
import type { CSSProperties } from "react";

const WIDTHS = [640, 1280, 1920] as const;

export type PhotoName = "porch" | "storyteller" | "book" | "phone" | "hands" | "gift";

export function Photo({
  name,
  alt,
  sizes = "100vw",
  priority = false,
  className = "",
  style,
}: {
  name: PhotoName;
  alt: string;
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
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
      style={style}
    />
  );
}
