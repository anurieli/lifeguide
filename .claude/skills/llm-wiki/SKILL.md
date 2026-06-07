---
name: llm-wiki
description: Maintain an Andrey Karpathy-style LLM wiki for LifeGuide research. Use when the user asks to create, ingest into, reorganize, or query the research wiki; when raw source material should be turned into interconnected Markdown notes; or when a research folder should follow Karpathy's "raw + wiki + index + log + schema" method.
---

# LLM Wiki

Maintain `docs/research/wiki/` as an LLM-generated wiki over raw source material, following Karpathy's method: keep source data unchanged in `raw/`, write synthesized Markdown pages in `wiki/`, and keep a schema file, `index.md`, and `log.md` current.

Reference method: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## Folder Contract

- `docs/research/wiki/raw/` is append-only source material. Do not rewrite or "clean up" source files.
- `docs/research/wiki/wiki/` is agent-written Markdown. Pages should be concise, linked, and source-grounded.
- `docs/research/wiki/CLAUDE.md` is the local schema and operating contract. Read it before editing the wiki.
- `docs/research/wiki/index.md` is the human entry point and map of contents.
- `docs/research/wiki/log.md` records every ingestion or significant reorganization.

## Workflow

1. Read `docs/research/wiki/CLAUDE.md`.
2. Inspect `raw/` for source files and `wiki/` for existing pages before writing.
3. If ingesting new material, put it in `raw/` first, preserving the original text and origin metadata when available.
4. Write or update pages in `wiki/` from the raw material. Prefer durable concepts over one-off summaries.
5. Link related wiki pages with relative Markdown links.
6. Update `index.md` when adding, renaming, merging, or retiring pages.
7. Append a short entry to `log.md` with date, source files touched, wiki pages touched, and unresolved questions.

## Quality Bar

- Every factual claim that depends on source material should point back to a raw file, URL, or named source.
- Distinguish source facts from interpretation.
- Preserve disagreement and uncertainty instead of smoothing it away.
- Do not promote wiki notes to product spec. Resolved decisions still need the normal LifeGuide docs path: feature doc, architecture doc, or ADR.
