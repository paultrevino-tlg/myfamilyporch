// Elder-facing surface. Atkinson Hyperlegible (designed for low vision) and
// Fraunces now come from the root layout site-wide, so this group only sets the
// full-height frame. Large, high-contrast, calm: see SPEC § Elder-facing UX
// principles.
export default function StorytellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen font-sans">{children}</div>;
}
