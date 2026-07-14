"use client";

// ============================================================================
// The daily read: whatever the "Read" button on a ritual step shows once
// ImmersiveReader is open. Today that's either the Blueprint document or a
// freeform ritual-item string (see RitualSequence.tsx's readContent()) — kept
// as its own component so the render logic has a home to grow into rather
// than living inline in the reader shell.
// ============================================================================

// Minimal markdown rendering for doctrine-shaped text: ## / ### headings,
// *italic-only* payoff lines, everything else a paragraph. No dependency.
export function DailyRead({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const b = block.trim();
        if (!b) return null;
        if (b.startsWith("### "))
          return (
            <h3 key={i} className="text-[19px] font-semibold text-ink mt-9 mb-3">
              {b.slice(4)}
            </h3>
          );
        if (b.startsWith("## "))
          return (
            <h2 key={i} className="text-[22px] font-semibold text-ink mt-11 mb-3 tracking-tight">
              {b.slice(3)}
            </h2>
          );
        if (b.startsWith("*") && b.endsWith("*"))
          return (
            <p
              key={i}
              className="italic text-ink-soft border-l-2 border-gold/50 pl-4 my-4 leading-[1.85]"
            >
              {b.slice(1, -1)}
            </p>
          );
        return (
          <p key={i} className="text-ink leading-[1.85] my-4">
            {b}
          </p>
        );
      })}
    </>
  );
}
