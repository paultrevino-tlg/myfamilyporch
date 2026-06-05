import type { ReactNode } from "react";

// Shared horizontal container for the marketing site (Phase 8.1). One place
// owns the max-width + responsive side padding so every section lines up.
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 sm:px-7 ${className}`}>
      {children}
    </div>
  );
}
