# LLM Wiki Schema

This folder follows Andrey Karpathy's LLM wiki method: raw source material stays in `../raw/`; LLM-generated Markdown lives in this `wiki/` folder; `index.md` is the entry point; `log.md` records changes.

Source: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## Directories

- `../raw/` - source material. Add files here before synthesis. Keep original wording, timestamps, URLs, and provenance when available.
- `./` - synthesized Markdown pages. These are editable and should improve over time.

## Wiki Page Shape

Use this structure for pages in `wiki/` unless a topic clearly needs something else:

```md
# Topic Name

## Summary

One short paragraph.

## Core Ideas

- Durable idea, with source link or raw-file reference.

## Evidence

- Source-grounded notes, quotes kept short.

## Open Questions

- What remains unclear?

## Related

- [Related page](related-page.md)
```

## Naming

- Use lowercase kebab-case filenames.
- One durable concept per page.
- Split pages when they start mixing unrelated concepts.
- Merge pages when they duplicate the same concept.

## Rules

- Do not edit source files in `../raw/` except to add missing provenance headers.
- Do not invent citations.
- Mark interpretation explicitly.
- Update `index.md` and `log.md` in the same change as wiki edits.
- Nothing in this folder is product spec until promoted to the appropriate canonical doc.
