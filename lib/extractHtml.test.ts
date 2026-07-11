import { describe, it, expect } from "vitest";
import { decodeEntities, extractFromHtml, pageToExtractedText } from "./extractHtml";

const PAGE = `<!doctype html>
<html>
<head>
  <title>Fallback Title | Site</title>
  <meta property="og:title" content="How to Find Your Zone of Genius" />
  <meta name="description" content="A practical guide." />
  <meta property="og:site_name" content="Example Mag" />
  <style>.x{color:red}</style>
  <script>console.log("noise")</script>
</head>
<body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <article>
    <h1>How to Find Your Zone of Genius</h1>
    <p>Most people live in their zone of excellence &mdash; good at it, drained by it.</p>
    <p>The zone of genius is different: it&rsquo;s the work that gives you energy.</p>
  </article>
  <footer>Copyright 2026</footer>
</body>
</html>`;

describe("extractFromHtml", () => {
  it("prefers og:title over <title>", () => {
    const page = extractFromHtml(PAGE);
    expect(page.title).toBe("How to Find Your Zone of Genius");
    expect(page.description).toBe("A practical guide.");
    expect(page.siteName).toBe("Example Mag");
  });

  it("extracts article text and drops nav/script/style/footer", () => {
    const page = extractFromHtml(PAGE);
    expect(page.mainText).toContain("zone of excellence");
    expect(page.mainText).toContain("gives you energy");
    expect(page.mainText).not.toContain("console.log");
    expect(page.mainText).not.toContain("Home");
    expect(page.mainText).not.toContain("Copyright");
  });

  it("decodes entities in body text", () => {
    const page = extractFromHtml(PAGE);
    expect(page.mainText).toContain("it’s the work");
  });

  it("keeps paragraph breaks so sentences do not glue together", () => {
    const page = extractFromHtml(PAGE);
    const lines = page.mainText.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to <title> when no og:title", () => {
    const html = `<html><head><title>Plain Title</title></head><body><p>Hi there world</p></body></html>`;
    expect(extractFromHtml(html).title).toBe("Plain Title");
  });

  it("caps mainText length", () => {
    const html = `<html><body><p>${"word ".repeat(5000)}</p></body></html>`;
    expect(extractFromHtml(html, 1000).mainText.length).toBeLessThanOrEqual(1000);
  });
});

describe("pageToExtractedText", () => {
  it("composes title, description, and body", () => {
    const text = pageToExtractedText(extractFromHtml(PAGE));
    expect(text.startsWith("How to Find Your Zone of Genius")).toBe(true);
    expect(text).toContain("A practical guide.");
    expect(text).toContain("zone of excellence");
  });

  it("skips a description that duplicates the title", () => {
    const text = pageToExtractedText({ title: "Same", description: "Same", mainText: "Body" });
    expect(text).toBe("Same\n\nBody");
  });
});

describe("decodeEntities", () => {
  it("handles named, decimal, and hex entities", () => {
    expect(decodeEntities("a &amp; b &#65; &#x42;")).toBe("a & b A B");
  });
});
