import type { ReactNode } from "react";
import { Photo, type PhotoName } from "./Photo";

// An empty list as a quiet Porchlight moment instead of a bare line of text:
// a short photographic strip above the existing message. Used where a family
// first lands before anything has happened ("No stories yet", "No storytellers
// yet"). The message keeps the page's own wording and links.
export function EmptyState({
  photo,
  alt,
  position = "50% 50%",
  as: Tag = "div",
  className = "",
  children,
}: {
  photo: PhotoName;
  alt?: string;
  position?: string;
  // "li" when the empty state sits inside a <ul>, so the list stays valid.
  as?: "div" | "li";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`card overflow-hidden ${className}`}>
      <Photo
        name={photo}
        alt={alt}
        sizes="(min-width: 768px) 48rem, 100vw"
        className="h-36 w-full object-cover sm:h-44"
        style={{ objectPosition: position }}
      />
      <div className="px-5 py-6 text-center text-[0.95rem] text-ink/70">{children}</div>
    </Tag>
  );
}
