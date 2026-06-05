// Section illustrations (Phase 8.9): crafted, dependency-free inline SVGs in the
// blue brand palette, woven through the home page. All are decorative
// (aria-hidden) — they never carry meaning the copy doesn't already give.
//
// The "porch + rocking chair" and "sound-wave railing" motifs tie the brand's
// signature element (brief §5) through the site; the keepsake mockup shows what
// a family actually receives (brief §6).

type Props = { className?: string };

/**
 * Sound-wave-as-porch-railing — the signature motif. Inherits its color from
 * the parent via `currentColor`; pair with a `text-*` utility.
 */
export function WaveRailing({ className }: Props) {
  return (
    <svg
      viewBox="0 0 240 24"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      <path
        d="M3 12 Q23 1 43 12 Q63 23 83 12 Q103 1 123 12 Q143 23 163 12 Q183 1 203 12 Q223 23 237 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A porch with a rocking chair, line-art. Decorative scene accent; inherits
 * color via `currentColor`.
 */
export function PorchScene({ className }: Props) {
  return (
    <svg
      viewBox="0 0 220 200"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      >
        {/* porch roof eave */}
        <path d="M22 56 L110 22 L198 56" opacity="0.9" />
        {/* posts */}
        <path d="M40 56 L40 168" opacity="0.6" />
        <path d="M180 56 L180 168" opacity="0.6" />
        {/* floor */}
        <path d="M30 168 L190 168" opacity="0.35" />
        {/* rocking chair (side view) */}
        <path d="M70 158 Q110 182 150 156" />
        <path d="M84 158 L92 96 L80 56" />
        <path d="M114 96 L106 60" />
        <path d="M80 56 Q92 40 106 60" />
        <path d="M92 96 L142 96" />
        <path d="M142 96 L152 158" />
        <path d="M82 76 L142 84" />
        <path d="M142 84 L142 96" />
      </g>
    </svg>
  );
}

/**
 * The keepsake: a hardcover book whose cover carries the rocking-chair emblem, a
 * voice waveform, and a "scan to hear their voice" code — voice + written +
 * book, in one object. Self-colored (brand palette) so it reads on any section.
 */
export function KeepsakeMockup({ className }: Props) {
  return (
    <svg
      viewBox="0 0 300 240"
      className={className}
      role="img"
      aria-label="A keepsake book of recorded family stories"
      focusable="false"
    >
      <defs>
        <linearGradient id="mfpKeepTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      {/* page peeking behind the cover */}
      <rect x="92" y="34" width="168" height="188" rx="12" fill="#F4F8FC" stroke="#E1E9F2" strokeWidth="2" />
      {/* front cover */}
      <rect x="64" y="22" width="172" height="194" rx="14" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.5" />
      {/* spine shading */}
      <path d="M82 26 L82 212" stroke="#E1E9F2" strokeWidth="2" />

      {/* rocking-chair emblem tile */}
      <g transform="translate(104,40)">
        <rect width="44" height="44" rx="11" fill="url(#mfpKeepTile)" />
        <g transform="translate(22,22) scale(0.62) translate(-32,-32)">
          <path d="M13 20 L32 11 L51 20" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" opacity="0.92" />
          <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 48 Q32 55 47 47" />
            <path d="M24 48 L26 37 L24 22" />
            <path d="M29 37 L28 23" />
            <path d="M24 22 Q26 19 28 23" />
            <path d="M26 37 L41 37" />
            <path d="M41 37 L44 48" />
            <path d="M25 29 L41 31" />
            <path d="M41 31 L41 37" />
          </g>
        </g>
      </g>

      {/* title lines */}
      <rect x="160" y="50" width="56" height="7" rx="3.5" fill="#15233B" opacity="0.75" />
      <rect x="160" y="64" width="40" height="7" rx="3.5" fill="#15233B" opacity="0.35" />

      {/* voice waveform */}
      <g stroke="#2563EB" strokeWidth="4" strokeLinecap="round">
        <path d="M104 132 L104 148" />
        <path d="M118 124 L118 156" />
        <path d="M132 114 L132 166" />
        <path d="M146 126 L146 154" />
        <path d="M160 118 L160 162" />
        <path d="M174 130 L174 150" />
        <path d="M188 122 L188 158" />
      </g>

      {/* "scan to hear" code */}
      <rect x="104" y="178" width="34" height="34" rx="5" fill="none" stroke="#15233B" strokeWidth="2" opacity="0.65" />
      <g fill="#15233B" opacity="0.65">
        <rect x="110" y="184" width="8" height="8" rx="1.5" />
        <rect x="124" y="184" width="8" height="8" rx="1.5" />
        <rect x="110" y="198" width="8" height="8" rx="1.5" />
        <rect x="124" y="198" width="4" height="4" rx="1" />
        <rect x="130" y="204" width="4" height="4" rx="1" />
      </g>
      <rect x="150" y="186" width="66" height="6" rx="3" fill="#15233B" opacity="0.3" />
      <rect x="150" y="198" width="50" height="6" rx="3" fill="#15233B" opacity="0.2" />
    </svg>
  );
}
