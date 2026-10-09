import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "./Container";
import { Photo, type PhotoName } from "./Photo";

// Porchlight editorial building blocks (design direction 1), shared by every
// marketing page so the layouts stay one system: narrow measure, hairline
// rules, nothing floats. Server components, no JS.

export type Action = { href: string; label: string };

// Page-level intro for every page but home: eyebrow, display headline, lede,
// optional actions, and an optional full-bleed photographic plate beneath.
export function PageIntro({
  label,
  title,
  children,
  actions,
  photo,
}: {
  label: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: Action[];
  photo?: { name: PhotoName; alt: string; caption?: string; position?: string };
}) {
  return (
    <>
      <Container className="pb-[clamp(3rem,7vh,5.5rem)] pt-[clamp(3.5rem,9vh,7rem)]">
        <p className="eyebrow rise">{label}</p>
        <h1 className="display display-lg rise mt-4 max-w-[18ch]">{title}</h1>
        {children && <div className="lede rise mt-6 max-w-2xl text-ink/85">{children}</div>}
        {actions && actions.length > 0 && (
          <div className="rise mt-8 flex flex-wrap gap-3.5">
            {actions.map((a, i) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className={`${i === 0 ? "btn-primary" : "btn-ghost"} px-7 py-3.5 font-serif text-base font-medium`}
              >
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </Container>
      {photo && <Plate {...photo} />}
    </>
  );
}

// The editorial section head: a small margin label beside (desktop) or above
// (phone) a display line, set in the narrow measure on the right.
export function SectionHead({
  label,
  title,
  size = "lg",
  children,
}: {
  label: string;
  title: ReactNode;
  size?: "lg" | "md";
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_36rem] lg:gap-20">
      <p className="marginalia rise">{label}</p>
      <div className="rise">
        <h2 className={`display ${size === "lg" ? "display-lg" : "display-md"}`}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Lede paragraph(s) under a SectionHead title.
export function Lede({ children }: { children: ReactNode }) {
  return <div className="lede mt-6 space-y-4 text-ink/85">{children}</div>;
}

// A full-bleed photographic plate between sections, with a quiet caption.
export function Plate({
  name,
  alt,
  caption,
  position = "50% 50%",
}: {
  name: PhotoName;
  alt: string;
  caption?: string;
  position?: string;
}) {
  return (
    <figure className="rise relative overflow-hidden">
      <Photo
        name={name}
        alt={alt}
        className="h-[clamp(20rem,58vh,40rem)] w-full object-cover"
        // Inline so each plate can frame its own subject in the crop.
        style={{ objectPosition: position }}
      />
      {caption && (
        <>
          {/* Low scrim so the caption reads over bright parts of any photo. */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(44,34,27,.7)] to-transparent"
          />
          <figcaption className="absolute bottom-5 left-6 right-6 text-[0.8rem] uppercase tracking-[0.16em] text-cream [text-shadow:0_1px_12px_rgba(44,34,27,.8)]">
            {caption}
          </figcaption>
        </>
      )}
    </figure>
  );
}

// Level-meter bars; heights in %, each bar on its own sway delay.
export function Bars({ heights, className }: { heights: number[]; className: string }) {
  return (
    <span aria-hidden className={`vu flex items-end ${className}`}>
      {heights.map((h, i) => (
        <i
          key={i}
          className="block rounded-sm bg-brand"
          style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

// The voice waveform (sound-wave / porch-railing motif, brief §5).
export const WAVE = [6, 10, 15, 9, 19, 25, 17, 28, 21, 13, 23, 11, 16, 8, 5, 12, 20, 26, 14, 7];

export function Wave({ className = "" }: { className?: string }) {
  return <Bars heights={WAVE.map((h) => h * 3.4)} className={`h-14 gap-1 opacity-75 [&>i]:w-[5px] ${className}`} />;
}

const ROW_TITLE = "font-serif text-[clamp(1.35rem,1.2rem+0.6vw,1.8rem)] font-medium leading-tight";

// Asymmetric title/body pairs on hairline rows — the editorial replacement for
// a card grid.
export function Rows({
  items,
  className = "mt-12",
}: {
  items: { title: string; body: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={`border-t border-line ${className}`}>
      {items.map((k) => (
        <div
          key={k.title}
          className="rise grid gap-x-12 gap-y-3 border-b border-line py-9 transition-colors duration-500 ease-porch hover:bg-surface2 md:grid-cols-[1fr_1.35fr] md:items-start"
        >
          <h3 className={ROW_TITLE}>{k.title}</h3>
          <div className="space-y-3 text-ink/80">{k.body}</div>
        </div>
      ))}
    </div>
  );
}

// Numbered steps on hairline rows, a large clay numeral in the margin.
export function NumberedRows({ items }: { items: { n: string; title: string; body: ReactNode }[] }) {
  return (
    <ol className="mt-12 border-t border-line">
      {items.map((s) => (
        <li
          key={s.n}
          className="rise grid grid-cols-[auto_1fr] gap-x-6 border-b border-line py-9 transition-[background-color,padding] duration-500 ease-porch hover:bg-surface2 hover:pl-5 lg:grid-cols-[6rem_1fr] lg:gap-x-10"
        >
          <span aria-hidden className="font-serif text-[clamp(2.5rem,2rem+2vw,4rem)] font-light leading-[0.8] text-brand">
            {s.n}
          </span>
          <div>
            <h3 className={ROW_TITLE}>{s.title}</h3>
            <div className="mt-2 max-w-[44rem] space-y-3 text-ink/80">{s.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// A ruled checklist with clay em-dash markers.
export function Checks({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`mt-8 ${className}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-4 border-t border-ink/15 py-3.5">
          <span aria-hidden className="flex-none text-brand">—</span>
          {t}
        </li>
      ))}
    </ul>
  );
}

// A pull quote with the voice waveform and a small-caps attribution.
export function PullQuote({ quote, cite }: { quote: ReactNode; cite: string }) {
  return (
    <div className="rise">
      <blockquote className="max-w-[22ch] font-serif text-[clamp(1.7rem,1.1rem+2.6vw,3.4rem)] font-light italic leading-[1.16] tracking-[-0.015em]">
        {quote}
      </blockquote>
      <Wave className="mt-10" />
      <p className="mt-8 text-[0.85rem] uppercase tracking-[0.16em] text-brand">{cite}</p>
    </div>
  );
}

// Native <details> on hairline rows — accessible, keyboard-friendly, zero JS.
export function FaqList({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="mt-12 border-t border-ink/15">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-ink/15 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-baseline gap-8 py-6 font-serif text-[clamp(1.1rem,1rem+0.5vw,1.4rem)] transition-colors duration-300 hover:text-brand">
            {item.q}
            <span
              aria-hidden
              className="ml-auto text-[1.4rem] text-brand transition-transform duration-500 ease-porch group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="max-w-[52rem] pb-7 text-ink/80">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

// A "read more →" link closing a section.
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="mt-10">
      <Link href={href} className="link text-base">
        {children}
      </Link>
    </p>
  );
}

// Closing band: umber, with the porch-light glow (brief §5 porch motif). The
// first action is the solid cream button; the rest are cream outlines.
export function ClosingBand({
  title,
  children,
  actions,
}: {
  title: ReactNode;
  children?: ReactNode;
  actions: Action[];
}) {
  return (
    <section className="on-dark relative overflow-hidden bg-ink py-[clamp(4.5rem,9vh,8.5rem)] text-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[30%] left-[12%] h-[44rem] w-[44rem] rounded-full bg-[radial-gradient(circle,rgba(217,150,47,.38),transparent_62%)] blur-[18px]"
      />
      <Container className="relative">
        <h2 className="display display-lg rise max-w-[16ch]">{title}</h2>
        {children && <p className="lede rise mt-5 max-w-[34rem] text-cream/75">{children}</p>}
        <div className="rise mt-8 flex flex-wrap gap-3.5">
          {actions.map((a, i) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={`${i === 0 ? "btn-cream" : "btn-line-cream"} px-7 py-3.5 font-serif text-base font-medium`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
