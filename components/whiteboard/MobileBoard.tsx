"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SurfaceId, NodeDoc, CaptureDoc } from "@/lib/types";
import { useNodes } from "@/hooks/useNodes";
import { useCaptures } from "@/hooks/useCaptures";
import {
  Sparkles,
  Plus,
  X,
  FileText,
  LinkIcon,
  Quote as QuoteIcon,
  Loader2,
  Download,
} from "lucide-react";

// The phone rendering of the Vision Board. The desktop surface is an infinite
// pan/zoom canvas; on a phone that gesture model fights the browser and cards
// end up off-screen, so here the same nodes are a plain, non-scrollable-board
// vertical list — every item and its data, top to bottom. Placing, dismissing,
// and reading all still work; only the spatial canvas is dropped.
export function MobileBoard({ surfaceId }: { surfaceId: SurfaceId }) {
  const { nodes, remove } = useNodes(surfaceId);
  const { inbox, place, softDelete } = useCaptures();

  // Newest first so a just-added card lands at the top of the list.
  const items = [...nodes].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="h-full overflow-y-auto bg-paper">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-5">
        <header className="mb-4">
          <h1 className="text-lg font-semibold text-ink">Vision Board</h1>
          <p className="text-xs text-ink-mute mt-0.5">
            The life you want, one card at a time.
          </p>
        </header>

        {/* Inbox: captures still waiting to be placed. */}
        {inbox.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-medium text-ink">
              <Sparkles className="w-4 h-4 text-gold" />
              Inbox
              <span className="text-ink-mute font-normal">
                · {inbox.length} to place
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {inbox.map((c) => (
                <CaptureItem
                  key={c._id}
                  capture={c}
                  onPlace={() => void place({ captureId: c._id, surfaceId })}
                  onDismiss={() => void softDelete({ captureId: c._id })}
                />
              ))}
            </div>
          </section>
        )}

        {/* The board itself, as a list. */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card/50 px-4 py-10 text-center">
            <p className="text-sm text-ink-soft">Your board is empty.</p>
            <p className="text-xs text-ink-mute mt-1">
              Add ideas from a bigger screen, or record a brain dump to fill it.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((n) => (
              <NodeItem
                key={n._id}
                node={n}
                onDelete={() => void remove({ nodeId: n._id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Pillars ------------------------------------------------------------
function Pillars({ pillars }: { pillars: string[] }) {
  if (pillars.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {pillars.map((p) => (
        <span
          key={p}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-paper-2 text-ink-mute"
        >
          {p}
        </span>
      ))}
    </div>
  );
}

// ---- A single board node as a list row ---------------------------------
function NodeItem({ node, onDelete }: { node: NodeDoc; onDelete: () => void }) {
  // Resolve a stored file's URL the same way NodeCard does (imageUrl wins if set).
  const fileUrl = useQuery(
    api.files.getUrl,
    node.fileId && !node.imageUrl ? { fileId: node.fileId } : "skip",
  );
  const img = node.imageUrl ?? fileUrl ?? undefined;

  return (
    <div className="group relative rounded-xl border border-line bg-card shadow-sm overflow-hidden">
      <button
        onClick={onDelete}
        aria-label="Dismiss card"
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-ink/5 hover:bg-ink/10 text-ink-mute flex items-center justify-center transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <NodeBody node={node} img={img} />
    </div>
  );
}

function NodeBody({ node, img }: { node: NodeDoc; img: string | undefined }) {
  const text = node.text?.trim();

  // Image / generated image: the picture, with any caption or prompt beneath.
  if (node.type === "image" || node.type === "generated_image") {
    const generating = node.type === "generated_image" && node.attribution === "generating";
    const errored = node.type === "generated_image" && node.attribution === "error";
    return (
      <div>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full max-h-72 object-cover" />
        ) : generating ? (
          <div className="flex items-center justify-center gap-2 h-40 text-ink-mute">
            <Loader2 className="w-4 h-4 animate-spin text-[#7c3aed]" />
            <span className="text-xs">Generating…</span>
          </div>
        ) : errored ? (
          <div className="flex items-center justify-center h-40 text-xs text-ink-mute">
            Couldn&apos;t generate that image.
          </div>
        ) : null}
        {(node.title || text) && (
          <div className="p-3">
            {node.title && <div className="text-sm font-medium text-ink">{node.title}</div>}
            {text && <div className="text-xs text-ink-soft mt-0.5 line-clamp-4">{text}</div>}
            <Pillars pillars={node.pillars} />
          </div>
        )}
        {!node.title && !text && node.pillars.length > 0 && (
          <div className="p-3">
            <Pillars pillars={node.pillars} />
          </div>
        )}
      </div>
    );
  }

  // Link: title, the destination, and its source.
  if (node.type === "link") {
    const href = node.attribution ?? text ?? "#";
    return (
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-mute mb-1">
          <LinkIcon className="w-3 h-3" /> Link
        </div>
        {node.title && <div className="text-sm font-medium text-ink">{node.title}</div>}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-accent break-words underline-offset-2 hover:underline"
        >
          {text ?? node.attribution}
        </a>
        {node.attribution && node.attribution !== text && (
          <div className="text-ink-mute text-xs mt-1 truncate">{node.attribution}</div>
        )}
        <Pillars pillars={node.pillars} />
      </div>
    );
  }

  // File: name, type, and a download link.
  if (node.type === "file") {
    return (
      <div className="p-3">
        <div className="flex items-center gap-2.5">
          <FileText className="w-7 h-7 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink truncate">
              {node.fileName ?? "Document"}
            </div>
            <div className="text-ink-mute text-xs truncate">{node.mimeType ?? "file"}</div>
          </div>
          {img && (
            <a
              href={img}
              target="_blank"
              rel="noreferrer"
              aria-label="Download"
              className="w-8 h-8 rounded-lg bg-paper-2 text-ink-soft flex items-center justify-center shrink-0"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
        <Pillars pillars={node.pillars} />
      </div>
    );
  }

  // Quote: italic with a gold rule; falls through the same block as text.
  if (node.type === "quote") {
    return (
      <div className="p-3 border-l-[3px] border-l-gold">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-mute mb-1">
          <QuoteIcon className="w-3 h-3" /> Quote
        </div>
        <div className="text-sm italic text-ink whitespace-pre-wrap">{text || "—"}</div>
        {node.attribution && (
          <div className="text-xs text-ink-mute mt-1">— {node.attribution}</div>
        )}
        <Pillars pillars={node.pillars} />
      </div>
    );
  }

  // Plain text.
  return (
    <div className="p-3">
      {node.title && <div className="text-sm font-medium text-ink mb-0.5">{node.title}</div>}
      <div className="text-sm text-ink whitespace-pre-wrap">
        {text || <span className="text-ink-mute">Empty card</span>}
      </div>
      <Pillars pillars={node.pillars} />
    </div>
  );
}

// ---- An inbox capture as a list row (place / dismiss) ------------------
function CaptureItem({
  capture,
  onPlace,
  onDismiss,
}: {
  capture: CaptureDoc;
  onPlace: () => void;
  onDismiss: () => void;
}) {
  const fileUrl = useQuery(
    api.files.getUrl,
    capture.rawFileId ? { fileId: capture.rawFileId } : "skip",
  );
  const d = capture.distilled;
  const pending = !d && capture.rawType !== "image";

  return (
    <div className="group relative rounded-xl border border-line bg-paper/60 p-3">
      <button
        onClick={onDismiss}
        aria-label="Dismiss idea"
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-ink/5 hover:bg-ink/10 text-ink-mute flex items-center justify-center transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {capture.rawFileId && fileUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl} alt="" className="w-full h-28 object-cover rounded-lg mb-2" />
      )}

      {d ? (
        <>
          <div className="text-sm font-medium text-ink pr-6">{d.title}</div>
          <div className="text-xs text-ink-soft mt-0.5 line-clamp-3">{d.essence}</div>
          <Pillars pillars={d.pillars} />
        </>
      ) : (
        <div className="text-sm text-ink pr-6">
          {capture.rawType === "image" ? (
            <span className="text-ink-soft">Image</span>
          ) : (
            <span className="line-clamp-2">{capture.rawText ?? capture.rawUrl}</span>
          )}
          {pending && (
            <div className="text-[11px] text-ink-mute mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> distilling…
            </div>
          )}
        </div>
      )}

      <button
        onClick={onPlace}
        className="mt-2 w-full text-xs bg-ink text-paper rounded-lg py-2 flex items-center justify-center gap-1 active:opacity-90 transition"
      >
        <Plus className="w-3 h-3" /> Place on board
      </button>
    </div>
  );
}
