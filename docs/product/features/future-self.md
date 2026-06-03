# Future Self

**Status:** draft (proposed, not built) · **Element of:** the Core (publishes the aspiration text behind the visuals) · **Owns:** `futureSelf`

> Future Self is the visual you as aspiration: how you dress, how you carry yourself, the rooms you want to walk into, who you are becoming. It draws the world you want and who you are, and renders you living inside it.

## 1. Purpose
Lostness is partly a failure of imagination: you cannot move toward a self you cannot see. The other elements describe the life you want in text and themes; Future Self makes it a face. It is the pull, not the plan. By placing *you* (your actual likeness) inside the aesthetic and world of the [Vision Board](./vision-board.md), filtered through who the [Core](./core.md) says you are, it turns "the life I want" into "me, living it." Nothing else in the system shows you to yourself. See the evolved vision in [`../concept-and-soul.md`](../concept-and-soul.md).

## 2. User-facing behavior
A mostly visual surface: a gallery of stills of your future self, with the tools to make more.

The happy path, manual:
1. You upload your own photos (the likeness input). These are your raw material, never published anywhere.
2. You direct a generation in plain terms: an outfit, a hairstyle, a setting, a mood ("me in a tailored charcoal suit, walking out of a glass office at dusk"). You can leave the world implicit and let the surface draw the Vision Board's aesthetic and the Core's identity to fill it in.
3. The image renders asynchronously through the [AI layer](../../architecture/ai-layer.md) and lands in the gallery.
4. You keep it, refine it (try a different outfit or setting on the same idea), or discard it. Stills now; video of you living it comes later.
5. A kept still carries a short **caption**: the aspiration text behind the visual ("the version of me who is composed in rooms that used to intimidate me"). That caption is the only thing that leaves the element; it flows to the Core.

Coach-driven: the Coach can propose a Future Self image when it has something true to render ("you keep describing the calm, in-control version of you; want to see him?"), draft the generation prompt from the Core and Vision Board, kick off the render, and write the caption. You approve, refine, or discard. The Coach acts from far away here exactly as elsewhere: it never holds your photos, it asks the element to generate.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Upload likeness photo | You add a photo of yourself | Stores the image as likeness input; never published, never captioned | Manual | `futureSelf` (`kind:"upload"`, `fileId`) |
| Generate still | You direct a generation, or accept a Coach proposal | Draws Vision Board + Core through the Bus, builds the prompt, renders you placed in that life async via the AI layer | Both | `futureSelf` (`kind:"generated"`, `prompt`, `sourceFileIds`, `fileId`); draws `nodes`/`captures`, `mirror` |
| Refine / re-roll | You ask for a variation on a kept image | New generation reusing the same likeness inputs and a modified prompt; original is untouched | Both | new `futureSelf` row |
| Caption a still | On keep, manual edit, or Coach write | Sets the distilled aspiration text behind the visual; this is the published currency | Both | `futureSelf.caption`; publishes `futureSelf.added` to `interactions` |
| Tag pillars | On keep or edit | Marks which domains the image speaks to | Both | `futureSelf.pillars` |
| Keep / discard | You decide on a rendered image | Discard soft-deletes (`isActive=false`); keep persists it to the gallery and publishes its caption | Manual | `futureSelf.isActive` |
| Promote to the board | You (or Coach) place a kept still on the Vision Board | Creates a `generated_image` node referencing the image; the board owns the node, Future Self still owns the source | Both | `nodes` (`type:"generated_image"`); no copy held |

## 4. Dynamics and interactions with other elements
Per [`../../architecture/context-bus.md`](../../architecture/context-bus.md), Future Self **owns** only `futureSelf` (the images of you and their captions). It holds no copy of any other element's data.

It is the system's standing example of **draw at act-time**: every generation rebuilds its context from source through the Bus and never persists it.
- **Draws the [Vision Board](./vision-board.md)** (the world, the aesthetic, the places and objects you want) so the generated scene matches the life you are building, not a generic one.
- **Draws the [Core](./core.md)** (who you are, your values, your north star) so the figure is *you becoming*, not a stranger in nice clothes.

It **publishes** only the distilled caption text into the Core stream (a `futureSelf.added` interaction). Per rule 3 of the elements model, the image is never the context; the meaning is. The Core's curation (the [Coach](./coach.md)'s hard filter) decides whether a caption strengthens, reshapes, or conflicts with the synthesized you.

Other edges: the [Coach](./coach.md) can drive any action here from far away; a kept still can be **promoted** to a Vision Board node (the board owns the node; Future Self keeps owning the source image, no duplication).

## 5. States
- **Empty.** No uploads, no generations. The surface invites you to add a photo or describe who you are becoming. A real hole, surfaceable by the Bus.
- **Likeness-only.** Photos uploaded, nothing generated yet. Ready to render.
- **Generating.** A render is in flight (async); a placeholder sits in the gallery until the AI layer returns.
- **Rendered, un-kept.** An image exists but you have not decided; no caption published yet.
- **Kept.** Captioned, pillar-tagged, `isActive`, caption published to the Core.
- **Conflicted.** A caption contradicts the current Core ("the seen, social you" vs a Core that reads as solitary). The Coach surfaces it rather than overwriting, per the Core's hard filter.
- **Archived / discarded.** `isActive=false`; out of the gallery, caption withdrawn from active context, row retained.

## 6. Edge cases
- **No likeness uploaded but a generation is asked for.** The surface either prompts for a photo first or generates a faceless/aspirational scene from the Vision Board + Core alone (no claimed likeness). Decided by the personalization choice in Open Questions.
- **Generation fails or is malformed** (provider error, unsafe content, no usable face). Nothing is kept; the placeholder clears with a quiet retry option. No partial row published.
- **Empty Vision Board / empty Core.** Drawing returns thin context; the generation leans on whatever the user typed and the result is more generic. The thinness is itself a gap signal, not an error.
- **Offline.** Uploads queue locally; generations require the AI layer and are deferred until connection returns. The gallery stays readable.
- **Likeness drift.** Old photos no longer look like you. Re-upload; old generations stay as a record of a past aspiration unless discarded.
- **A caption with no image kept.** Not allowed to publish: the caption is the text *behind a visual*, so it only flows when its still is kept.

## 7. AI involvement
Two distinct AI roles, both through the [AI layer](../../architecture/ai-layer.md):
1. **Prompt assembly (text model).** Builds the generation prompt by drawing the Vision Board aesthetic + Core identity through the Bus, blending them with your direction. Also distills the **caption** (the aspiration text behind the image) for publishing.
2. **Image generation (image model class).** Renders the still from the assembled prompt plus your likeness inputs (`sourceFileIds`). Runs async; video generation is a later addition of the same role. Model/provider selection and budgeting are owned by the AI layer, not this element.

What it draws: Vision Board nodes/captures text, Core summary and values. What it writes back: the image (`fileId`), the generation `prompt`, and the published `caption` only. Likeness photos are inputs, never published.

## 8. Data touched
**Owns** (per [`../../architecture/data-model.md`](../../architecture/data-model.md), proposed `futureSelf`): `userId`, `kind` (`upload`|`generated`), `fileId`, `prompt?`, `sourceFileIds?`, `caption?`, `pillars[]`, `isActive`, `createdAt`. Indexed `by_user` over `createdAt`.

**Publishes** to `interactions` (`type: "futureSelf.added"`, payload = caption + small envelope).

**Draws** (read-only at act-time, never held): `nodes` / `captures` (Vision Board), `mirror` (Core). On promote, **writes** a `nodes` row of `type: "generated_image"` owned by the Vision Board.

## 9. Open questions
- **One-off edits vs trained likeness.** Per-generation image edits (cheap, inconsistent face) vs a trained personal likeness model for consistent generation of *you* across stills and future video. Decide when this element is built. (Carried from [`../../architecture/elements-and-context.md`](../../architecture/elements-and-context.md).)
- Whether a generation is allowed with no likeness uploaded (faceless aspirational scene), and how that reads in the Core.
- Video: when stills graduate to video of you living the life, and whether that is the same element or a phased addition.
- Privacy handling of `sourceFileIds` (likeness photos): retention, deletion guarantees, and exclusion from all published context (settle with [`../../architecture/security-privacy.md`](../../architecture/security-privacy.md)).
