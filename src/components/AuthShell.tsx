import type { ReactNode } from "react";
import { Photo, type PhotoName } from "./Photo";
import { SITE_TAGLINE } from "@/lib/seo";

// The frame for the signed-out doorways into the app — sign-in and invitation
// pages — so the first screen a family member or invited relative sees carries
// the Porchlight warmth instead of a bare card on cream. Desktop: the photograph
// fills the left half; phones: a short photo strip above the card. Holds no
// state, so the client sign-in page can use it too.
export function AuthShell({
  photo,
  alt,
  position = "50% 50%",
  children,
}: {
  photo: PhotoName;
  alt?: string;
  position?: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative h-44 overflow-hidden sm:h-56 lg:h-auto">
        <Photo
          name={photo}
          alt={alt}
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: position }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 hidden h-1/3 bg-gradient-to-t from-[rgba(44,34,27,.7)] to-transparent lg:block"
        />
        <p className="absolute bottom-8 left-10 right-10 hidden font-serif text-3xl text-cream [text-shadow:0_1px_12px_rgba(44,34,27,.6)] lg:block">
          {SITE_TAGLINE}
        </p>
      </div>
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-2.5">
            <span aria-hidden className="lamp" />
            <span className="font-serif text-lg font-semibold tracking-tight">My Family Porch</span>
          </div>
          <div className="card p-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
