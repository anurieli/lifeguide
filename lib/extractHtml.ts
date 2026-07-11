// ============================================================================
// extractHtml: pure HTML -> readable text, no dependencies, unit-testable.
// Used by the ingest pipeline (convex/ai/ingest.ts) to turn a fetched link into
// the capture's extractedText. Deliberately heuristic: we want the article's
// meaning for analysis, not a perfect render.
// ============================================================================

export type ExtractedPage = {
  title?: string;
  description?: string;
  siteName?: string;
  mainText: string;
};

const BLOCK_STRIP = [
  "script",
  "style",
  "noscript",
  "svg",
  "iframe",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
];

// Minimal entity set; numeric entities handled generically.
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function safeFromCodePoint(cp: number): string {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

function metaContent(html: string, key: string): string | undefined {
  // Matches <meta property="og:title" content="..."> and name=, either attribute order.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*?content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${key}["']`,
    "i",
  );
  const m = html.match(re);
  const raw = m?.[1] ?? m?.[2];
  return raw ? decodeEntities(raw).trim() || undefined : undefined;
}

function stripTags(html: string): string {
  let s = html;
  for (const tag of BLOCK_STRIP) {
    s = s.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, "gi"), " ");
  }
  // Block-level closers become paragraph breaks so sentences don't glue together.
  s = s.replace(/<\/(p|div|section|article|li|h[1-6]|blockquote|tr|br)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  // Collapse whitespace but keep paragraph structure.
  s = s
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return s;
}

/**
 * Extract the readable substance of an HTML page. Prefers <article>, then <main>,
 * then <body>. Caps mainText at `cap` characters (default 8000) so a huge page
 * never bloats the capture.
 */
export function extractFromHtml(html: string, cap = 8000): ExtractedPage {
  const title =
    metaContent(html, "og:title") ??
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ? decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]).trim()
      : undefined);
  const description = metaContent(html, "og:description") ?? metaContent(html, "description");
  const siteName = metaContent(html, "og:site_name");

  const article =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    html;

  const mainText = stripTags(article).slice(0, cap).trim();
  return { title, description, siteName, mainText };
}

/**
 * Compose the capture's extractedText from an extracted page: title and
 * description up top (they often carry the point), then the body.
 */
export function pageToExtractedText(page: ExtractedPage, cap = 8000): string {
  const parts: string[] = [];
  if (page.title) parts.push(page.title);
  if (page.description && page.description !== page.title) parts.push(page.description);
  if (page.mainText) parts.push(page.mainText);
  return parts.join("\n\n").slice(0, cap).trim();
}
