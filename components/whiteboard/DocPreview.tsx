"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, GripVertical } from "lucide-react";

// Supported preview categories derived from MIME type.
type PreviewKind = "pdf" | "html" | "none";

function mimeToKind(mime: string | undefined): PreviewKind {
  if (!mime) return "none";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/html") return "html";
  return "none";
}

// --- HTML preview fetcher -------------------------------------------------
// We fetch the raw HTML text and inject it via srcdoc so the sandbox
// attribute is honoured (src= iframes ignore sandbox in some browsers when
// pointing at a same-origin URL; srcdoc always applies it).
function useHtmlContent(fileUrl: string | undefined, kind: PreviewKind) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (kind !== "html" || !fileUrl) {
      setHtml(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setHtml(null);
    setError(false);
    fetch(fileUrl)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fileUrl, kind]);

  return { html, error };
}

// --- Resize handle --------------------------------------------------------
// A bottom-right grip that lets the user resize the node.
// Reports the new { width, height } via onResize. The parent NodeCard
// owns the debounced persist call (so NodeCard can talk to the mutation).

type ResizeHandleProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  minW?: number;
  minH?: number;
  onResize: (w: number, h: number) => void;
};

function ResizeHandle({ containerRef, scale, minW = 200, minH = 160, onResize }: ResizeHandleProps) {
  const dragging = useRef(false);
  const startRef = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);
  // Keep stable refs to scale, minW, minH, onResize so the effect deps are clean.
  const scaleRef = useRef(scale);
  const minWRef = useRef(minW);
  const minHRef = useRef(minH);
  const onResizeRef = useRef(onResize);
  scaleRef.current = scale;
  minWRef.current = minW;
  minHRef.current = minH;
  onResizeRef.current = onResize;

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragging.current || !startRef.current) return;
      const s = scaleRef.current;
      const dx = (e.clientX - startRef.current.mx) / s;
      const dy = (e.clientY - startRef.current.my) / s;
      const newW = Math.max(minWRef.current, Math.round(startRef.current.w + dx));
      const newH = Math.max(minHRef.current, Math.round(startRef.current.h + dy));
      onResizeRef.current(newW, newH);
    };
    const handleUp = () => {
      dragging.current = false;
      startRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []); // stable effect; reads via refs

  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragging.current = true;
    startRef.current = {
      mx: e.clientX,
      my: e.clientY,
      w: rect.width / scaleRef.current,
      h: rect.height / scaleRef.current,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  return (
    <div
      onPointerDown={down}
      className="absolute bottom-0 right-0 w-5 h-5 flex items-center justify-center cursor-se-resize opacity-0 group-hover/preview:opacity-60 hover:!opacity-100 transition-opacity z-10"
      title="Resize"
      aria-label="Resize document preview"
    >
      <GripVertical className="w-3 h-3 text-ink-mute rotate-45" />
    </div>
  );
}

// --- Public component -----------------------------------------------------

export type DocPreviewProps = {
  fileUrl: string;
  fileName: string | undefined;
  mimeType: string | undefined;
  width: number;
  height: number;
  scale: number;
  onResize: (w: number, h: number) => void;
};

export function DocPreview({ fileUrl, fileName, mimeType, width, height, scale, onResize }: DocPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kind = mimeToKind(mimeType);
  const { html, error: htmlError } = useHtmlContent(fileUrl, kind);

  // The header bar (filename + download link). Always rendered at the top.
  const header = (
    <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-line shrink-0">
      <FileText className="w-3.5 h-3.5 shrink-0 text-ink-mute" />
      <span
        className="flex-1 min-w-0 text-xs font-medium text-ink truncate"
        title={fileName}
      >
        {fileName ?? "Document"}
      </span>
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        download={fileName}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-ink-mute hover:text-ink hover:bg-paper-2 transition-colors"
        title="Download"
        aria-label="Download document"
      >
        <Download className="w-3 h-3" />
      </a>
    </div>
  );

  // Body content: varies by kind.
  let body: React.ReactNode;

  if (kind === "pdf") {
    // embed is more widely supported for inline PDF viewing than iframe.
    // We add a fallback download link in case the browser cannot embed.
    body = (
      <div className="flex-1 min-h-0 relative">
        <embed
          src={fileUrl}
          type="application/pdf"
          className="absolute inset-0 w-full h-full rounded-b-xl"
          aria-label={fileName ?? "PDF document"}
        />
      </div>
    );
  } else if (kind === "html") {
    if (htmlError) {
      body = (
        <div className="flex-1 flex items-center justify-center text-xs text-ink-mute p-3">
          Could not load HTML preview.
        </div>
      );
    } else if (html === null) {
      body = (
        <div className="flex-1 flex items-center justify-center text-xs text-ink-mute p-3">
          Loading preview…
        </div>
      );
    } else {
      // Sandboxed iframe via srcdoc. No allow-scripts: prevents untrusted JS
      // from running. No allow-same-origin: prevents the iframe from accessing
      // the parent's cookies/localStorage. This is the safest configuration
      // for rendering arbitrary user-supplied HTML.
      body = (
        <div className="flex-1 min-h-0 relative overflow-auto">
          <iframe
            srcDoc={html}
            sandbox="allow-forms"
            className="absolute inset-0 w-full h-full border-0"
            title={fileName ?? "HTML document"}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      );
    }
  } else {
    // Unsupported mime: show the name and a download prompt.
    body = (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <FileText className="w-8 h-8 text-ink-mute" />
        <p className="text-xs text-ink-mute leading-relaxed">
          Preview not available for this file type.
        </p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          download={fileName}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-xs text-accent underline underline-offset-2 hover:text-ink transition-colors"
        >
          Download to open
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      // DocPreview is rendered inside the NodeCard outer div which already
      // has the absolute positioning, explicit width and height. This inner
      // container fills that space and provides the flex column layout for
      // the header + scrollable body. The "group" class enables the resize
      // handle opacity transition on hover.
      className="group/preview w-full h-full rounded-xl overflow-hidden flex flex-col"
      style={{ width, height }}
    >
      {header}
      {body}
      <ResizeHandle
        containerRef={containerRef}
        scale={scale}
        minW={200}
        minH={160}
        onResize={onResize}
      />
    </div>
  );
}
