import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Family Porch",
  description: "Capture a loved one's life stories, in their own voice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
