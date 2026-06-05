import type { ReactNode } from "react";
import { Container } from "./Container";

// Shared vertical-rhythm wrapper for marketing sections (Phase 8.1). Owns the
// section spacing so landing/other pages (8.2–8.7) stack consistently; pass an
// `id` to make a section an in-page anchor target (nav links to /#how-it-works
// etc.). Set `bleed` to render edge-to-edge content without the inner Container.
export function Section({
  children,
  id,
  className = "",
  containerClassName = "",
  bleed = false,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
  bleed?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 py-14 sm:py-20 ${className}`}
    >
      {bleed ? (
        children
      ) : (
        <Container className={containerClassName}>{children}</Container>
      )}
    </section>
  );
}
