# PillarOS Extraction Report

**Source:** `/Users/arielnurieli/Desktop/Life Board/PillarOS`
**Stack:** React 19 + Vite + TypeScript + TailwindCSS + Convex (real-time) + Google Gemini (`@google/genai`)
**Purpose of this doc:** Catalog every reusable AI-first pattern in PillarOS, document exactly how it works (file:line evidence), classify each as REUSE / ADAPT / REBUILD / DROP for the net-new **LifeGuide** app, and extract the central **context-bus** pattern that lets every surface share one intelligence layer.

> **Two prompt corrections up front:**
> 1. **It IS git-tracked.** The prompt said "not git-tracked." Wrong. There is a live `.git` dir with remote `https://github.com/anurieli/PillarOS.git`, latest commit `2b7af07 "Trying to fix chat for pillar creation, testing TBD"`. There are **uncommitted working changes** in `App.tsx`, `components/Layout.tsx`, `components/PillarCreator.tsx`, `convex/ai/architect.ts` — so what's on disk is ahead of the last commit. Read disk, not git.
> 2. **The "tool framework" is 11 tools, not 12.** CLAUDE.md claims 12; `getAvailableTools()` (`convex/ai/tools.ts:915`) returns exactly 11.

---

## 0. The headline: this is a single-pillar context engine, not yet a multi-surface one

PillarOS already nails the thing LifeGuide is built around: **the AI sees the entire board state on every call.** But it does it for *one surface* (a spatial canvas) scoped to *one pillar* at a time. The whole extraction job is: take its `generateBoardContext()` + `AI_PROCESSES` + tool-registry triad, and generalize "the board" into "every surface the user has open (brain dump, vision board, journal, roadmap)."

The good news: the architecture is already shaped for this. Context generation is a pure function, tools are a flat registry, and model config is fully centralized. The bad news: it's hard-locked to Gemini, the agent loop is single-pass (no tool-result feedback), memory is a single growing text blob (not indexed), and the API key leaks to the browser. All fixable on rebuild.

---

## 1. Ambient Agent Loop — `convex/ai/agent.ts`

### (a) What it does
A single Convex `action`, `getAmbientAgentResponse` (`agent.ts:71`), is the main chat brain. The client sends the full message history + pillarId + userId (+ optional selected item IDs). The server fetches all board data, serializes it into the system prompt, calls Gemini with the 11 tool declarations attached, executes any tool calls Gemini returns, and sends back `{ text, toolCalls, executedTools }`.

### (b) How it works — file:line
1. **Lazy client init** (`agent.ts:9-16`): `getAI()` only instantiates `GoogleGenAI` if `process.env.GOOGLE_API_KEY` is set; returns a graceful "API Key is missing" otherwise.
2. **Server-side data fetch** (`agent.ts:88-94`): runs four queries inside the action — `pillars.getPillar`, `items.getItemsByPillar`, `zones.getZonesByPillar`, `agentStates.getAgentState`. Memory = `agentState?.context || ""`. **Nothing the AI sees comes from the client** — context is rebuilt server-side from the DB every call. This is the security + freshness win.
3. **Context serialization** (`agent.ts:97-98`): `generateBoardContext(...)` → `JSON.stringify(context, null, 2)`. (Detailed in §2.)
4. **System-prompt assembly** (`agent.ts:100-107`): pulls `AI_PROCESSES.ambientAgent` and calls its `buildSystemPrompt({ pillarName, northStar, missions, boardContextJson, longTermMemory })`.
5. **The model call** (`agent.ts:110-121`):
   ```ts
   const response = await aiClient.models.generateContent({
     model: agentConfig.model,                         // "gemini-3-flash-preview"
     contents: args.messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
     config: {
       systemInstruction,
       tools: [{ functionDeclarations: getAvailableTools() }],
       ...buildGenerationParams("ambientAgent"),
     }
   });
   ```
   Note: **multi-turn history is just the raw `messages` array** passed straight through as `contents`. Roles are `"user" | "model"` (Gemini's convention).
6. **Tool-call extraction** (`agent.ts:124-125`): `response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall)`.
7. **The "loop"** (`agent.ts:128-147`): a `for` loop over `functionCalls`, each dispatched to `executeToolCall(ctx, { toolName, toolArgs, pillarId, userId })`. Errors are caught per-tool and pushed as `{ success:false, message }`. Returns `{ text, toolCalls, executedTools }`.

### CRITICAL GAP: it is NOT a real agentic loop
The prompt's framing of "functionCalls → executeToolCall → iterate" is **aspirational, not what the code does.** There is **no iteration**. The sequence is:
- One model call → maybe N tool calls executed → results collected → **returned to the client.**
- The tool results are **never fed back to the model for a second reasoning turn.** Gemini cannot see whether `create_item` succeeded, cannot chain "search then update," and cannot self-correct.
- The illusion of a loop happens **on the client** (`ChatPanel.tsx:309-330`): tool result `.message` strings get appended to the reply text as italic footnotes (`replyText += "\n\n*" + toolResults.join(', ') + "*"`).

So PillarOS is **"one-shot tool use"** (plan → act → report), not **ReAct** (think → act → observe → think → …).

### (c) Classification: **ADAPT** (port the shape, fix the loop)
The server-side-context + tool-registry + centralized-config shape is exactly right and should be reused. But for LifeGuide, replace the single-pass with a proper **multi-turn tool loop**: feed `executedTools` results back as `tool` role messages and re-invoke the model until it returns no more tool calls (cap at ~5 iterations). On an OpenAI stack this is the native `tool_calls` → `role:"tool"` → re-call pattern; trivial to do correctly.

### (d) How it informs "context-at-all-times"
This file is the **template for the LifeGuide agent endpoint**: every AI call should (1) be server-side, (2) rebuild full context from the DB rather than trust the client, (3) attach the global tool registry, (4) inject the serialized context + long-term memory into the system prompt. Generalize step 2 from "fetch one pillar's board" to "fetch every active surface's published state" (see §11, the Context Bus).

---

## 2. Board-Context Injection — `generateBoardContext()` (the crown jewel)

### (a) What it does
A pure function (`agent.ts:21-65`) that turns raw DB rows into a compact JSON object representing the **entire visible state of the board**, which is then dropped verbatim into the system prompt. This is the literal "AI sees everything" mechanic.

### (b) How it works — exactly what it serializes
```ts
const generateBoardContext = (currentPillar, items, zones, memory = "", selectedItemIds?) => {
  const filteredItems = selectedItemIds
    ? items.filter(i => selectedItemIds.includes(i._id))   // optional scoping to user-selected items
    : items;
  return {
    meta: {
      pillarName: currentPillar.name,
      northStar:  currentPillar.northStar,
      missions:   currentPillar.missions || [],            // [{id, text}] sub-goals
      timestamp:  new Date().toISOString(),
      longTermMemory: memory,                              // the compacted memory blob
    },
    groups: zones.map(z => ({                              // "zones" are renamed "groups" for the LLM
      id: z._id, name: z.name, color: z.color,
      position: z.position, dimensions: z.dimensions,      // spatial layout IS sent
    })),
    items: filteredItems.map(i => {
      const zone = zones.find(z => z._id === i.zoneId);
      return {
        id: i._id,
        type: i.type,                                      // text|link|image|file
        title: i.title || 'Untitled',
        content: i.content,                                // FULL content blob, untruncated
        analysis: i.analysis ?? i.metadata?.analysis,      // AI-extracted insight/OCR
        groupName: zone ? zone.name : 'Floating',          // resolves zoneId → human name
        comments: i.comments ?? i.metadata?.comments,      // user side-notes
        dimensions: i.dimensions,
        isTodo: i.isTodo || false,
        completed: i.completed || false,
        taskDescription: i.taskDescription,
        createdAt: i.createdAt,
        tags: i.tags || [],
      };
    }),
  };
};
```
Then `JSON.stringify(context, null, 2)` is interpolated into the prompt under `Current Board State (JSON):` (`models.ts:62-63`), with `longTermMemory` repeated again below it (`models.ts:65-66`).

### Key design decisions worth stealing
- **IDs are first-class.** Every item/zone carries its `_id`, and the prompt explicitly says "Use item IDs from the board context JSON above" (`models.ts:76`). This is what makes tool calls work — the model references real IDs, the executor patches real rows. **No fuzzy matching.**
- **Spatial layout is part of context.** Positions + dimensions are serialized, so the agent can reason about *where* things are and arrange them. For LifeGuide this generalizes to "the agent knows the structure/layout of each surface."
- **Selective scoping built in.** `selectedItemIds` lets the user (or system) narrow what the AI sees — a token-budget lever and a focus lever. Threaded all the way from `ChatPanel` (`ChatPanel.tsx:301`) → action arg (`agent.ts:79`) → filter (`agent.ts:29`).
- **Resolved, not raw.** `zoneId` is resolved to `groupName`; legacy `metadata.analysis`/`metadata.comments` are coalesced with new top-level fields. The model never sees dangling foreign keys or schema-migration cruft.

### Gaps / costs
- **Full `content` is sent untruncated** for every item. With a big board this blows the context window and cost. There is **no summarization or RAG** — it's "stuff the whole board into the prompt." The `selectedItemIds` filter and `lib/tokenUtils.ts` (token estimation) are the only mitigations.
- **Single-pillar only.** Context is one pillar's items+zones. Cross-pillar awareness does not exist.

### (c) Classification: **REUSE the pattern, REBUILD the implementation**
This function *is* the seed of LifeGuide's whole value prop. Keep the philosophy 1:1 (resolved JSON, IDs first-class, layout included, optional scoping). Rebuild it as a **multi-surface aggregator** with a token budget + per-surface summarization fallback.

### (d) How it informs "context-at-all-times"
Generalize `generateBoardContext(pillar, items, zones, memory)` →
`assembleUserContext(userId, { focusSurface?, tokenBudget? })` that returns:
```jsonc
{
  "meta": { "user", "timestamp", "northStar(s)", "longTermMemory", "activeSurface" },
  "surfaces": {
    "brainDump":  { /* items, untriaged notes */ },
    "visionBoard":{ /* goals, images, themes */ },
    "journal":    { /* recent entries, mood, streaks */ },
    "roadmap":    { /* milestones, current focus, doc sections */ }
  }
}
```
This is the **Context Bus** payload (full design in §11).

---

## 3. Tool Framework — `convex/ai/tools.ts` (928 lines)

### (a) What it does
Defines 11 tools the agent can call to mutate the board, plus a single `executeToolCall` action that dispatches them. Each tool = a Gemini `FunctionDeclaration` (name + description + JSON-schema params) paired with a handler block that calls one or more Convex mutations.

### (b) How it works — the definition + dispatch pattern
**Definition** (e.g. `createItemTool`, `tools.ts:47-101`): exported `FunctionDeclaration` objects using `Type.OBJECT / Type.STRING / Type.NUMBER / Type.BOOLEAN / Type.ARRAY`, with `description` strings that double as the model's usage instructions ("Use this when the user explicitly asks to add something") and `required` arrays.

**Registry** (`getAvailableTools()`, `tools.ts:915-929`): returns a flat array of all 11 declarations. This is what gets attached in `agent.ts:118`.

**Dispatch** (`executeToolCall`, `tools.ts:388-910`): a single `action` whose body is a long `if (args.toolName === '...')` chain. Each branch destructures `args.toolArgs`, runs Convex queries/mutations, returns `{ success, message, ...richData }`. Unknown tool → `{ success:false, message:"Unknown tool: ..." }` (`tools.ts:905`).

### The 11 tools (schema → mutation map)

| # | Tool | Key params | Backing Convex op | What it does |
|---|------|-----------|-------------------|--------------|
| 1 | `create_item` (`:47`) | title, type(text/image/link), content, comments, isTodo, taskDescription, x/y/w/h, metadata | `items.createItem` (`:456`) | Creates a card. **Smart-positions** via `findSmartPosition()` (`:10-42`) if x/y omitted — spirals out from viewport center to avoid overlaps. |
| 2 | `update_todo` (`:106`) | itemId, completed, isTodo, taskDescription | `items.updateItem` (`:488`) | Toggles task state / description. Conditional spread `...(completed!==undefined && {completed})`. |
| 3 | `arrange_items` (`:136`) | itemIds[], pattern(grid/list/cluster/radial), spacing, startX/Y | `items.updateItemPositions` (`:596`) | Computes new positions per pattern; batch position update. Pure layout math (`:531-593`). |
| 4 | `create_zone` (`:172`) | name, description, color, x/y/w/h | `zones.createZone` (`:613`) | New spatial group; order = current zone count. |
| 5 | `move_items_to_zone` (`:214`) | itemIds[], zoneId, arrange | `items.updateItem` loop (`:646`) | Batch-assigns items to a zone. |
| 6 | `search_items` (`:241`) | query, types[], tags[], limit | `items.getItemsByPillar` + JS filter (`:664-707`) | **Naive substring search** over title/content, title-match ranked higher. No embeddings. |
| 7 | `update_item` (`:273`) | itemId, title, content, x/y, zoneId, tags | `items.updateItem` (`:734`) | General edit. `zoneId:'null'` string → remove from zone. |
| 8 | `delete_item` (`:316`) | itemId | `items.deleteItem` (`:749`) | Soft delete. |
| 9 | `update_north_star` (`:334`) | northStar | `pillars.updatePillar` (`:760`) | Changes the pillar goal. |
| 10 | `check_alignment` (`:352`) | (none) | secondary Gemini call (`:772-838`) | **Nested AI call** — builds a lean board payload (title+task+zone only, intentionally drops content/positions, `:786-806`), runs `AI_PROCESSES.alignmentAnalysis` with `responseMimeType:'application/json'`, returns scored breakdown {overallScore, alignedItems, misalignedItems, gaps, recommendations}. |
| 11 | `reassess_tasks` (`:365`) | includeExisting, maxTasks | queries only (`:840-902`) | Heuristic (not AI): finds non-task items containing action words (`['review','check','update',...]`) or `?`, suggests them as tasks; boosts priority of >7-day-old incomplete tasks. |

### Two patterns worth naming
- **Rich-data return contract.** Handlers return more than `{success,message}`: `search_items` returns `items[]`, `check_alignment` returns `alignmentStatus`, `reassess_tasks` returns `taskList` + `actions[]`. The client (`ChatPanel.tsx:317-321`) cherry-picks these onto the chat message so it can render **interactive UI** (alignment scorecards, task lists with action buttons) instead of plain text. This is a clean "tool can drive UI, not just data" pattern.
- **Tool-as-nested-agent.** `check_alignment` shows a tool that itself calls the LLM — a sub-agent. Good precedent for LifeGuide's "reflect on my journal" type tools.

### (c) Classification: **ADAPT → generalize into a plugin registry**
The single-file `if/else` dispatch (`:388-910`) does not scale to a multi-surface app. Rebuild as a **typed registry** where each surface contributes its own tools:
```ts
type Tool = {
  name: string;
  description: string;
  schema: ZodSchema;           // OpenAI/Gemini-agnostic
  surface: 'brainDump' | 'visionBoard' | 'journal' | 'roadmap' | 'global';
  execute: (ctx, args, userCtx) => Promise<ToolResult>;
};
export const toolRegistry: Record<string, Tool> = { ... };
```
Then `getAvailableTools()` becomes `Object.values(toolRegistry)` (optionally filtered to the active surface), and dispatch becomes `toolRegistry[name].execute(...)` — no giant switch. **Keep the rich-data return contract verbatim.**

### (d) How it informs "context-at-all-times"
The tool registry is the **write half** of the context bus: any surface publishes both its *state* (read, §11) and its *mutations* (tools). When the journal surface is added, it registers `add_journal_entry`, `reflect_on_entries`, etc., and the same agent instantly gains those powers — no agent code changes.

---

## 4. Live Audio — `components/PillarCreator.tsx` (Gemini Live)

### (a) What it does
A real-time, bidirectional **voice conversation** with the Pillar Architect: user speaks → live transcription → Gemini responds with **streamed audio** + transcript, synced into the chat UI. Used only in the pillar-creation wizard.

### (b) How it works — file:line
- **Audio utils** (`PillarCreator.tsx:19-69`):
  - `createBlob(Float32Array)` (`:20-40`): converts mic samples → Int16 PCM → byte-string → `btoa` base64, tagged `audio/pcm;rate=16000`. This is the upstream encoding.
  - `decode(base64)` (`:42-50`): base64 → `Uint8Array`.
  - `decodeAudioData(...)` (`:52-69`): Int16 PCM → Float32 `AudioBuffer` for playback.
- **Two AudioContexts at different rates** (`:202-203`): input `16000` Hz (Gemini Live input spec), output `24000` Hz (Gemini Live output spec). This rate split is a hard requirement of the Live API.
- **Session connect** (`:219-331`): `ai.live.connect({ model: "gemini-2.5-flash-native-audio-preview-12-2025", callbacks, config })`. Config requests `responseModalities:[Modality.AUDIO]` plus **both** `inputAudioTranscription:{}` and `outputAudioTranscription:{}` (`:326-329`) — that's what gives you live captions of both sides.
- **Mic capture** (`onopen`, `:222-254`): `getUserMedia({audio:true})` → `createMediaStreamSource` → `createScriptProcessor(4096,1,1)`. In `onaudioprocess` (`:236-246`) it reads channel 0, `createBlob`s it, and `session.sendRealtimeInput({media: pcmBlob})`. A **muted gain node** (`gain.value=0`, `:233`) is wired into the destination so the processor keeps firing without feeding speakers (prevents echo).
- **Playback + transcript sync** (`onmessage`, `:255-312`):
  - Transcriptions accumulate into refs (`currentInputTranscription`/`currentOutputTranscription`) and render live (`:257-263`).
  - On `turnComplete` (`:265-291`) the buffered input+output become permanent `ChatMessage`s; refs reset.
  - Audio chunks (`modelTurn.parts[0].inlineData.data`, `:294`) are decoded and **scheduled gaplessly**: `nextStartTimeRef = max(nextStartTime, ctx.currentTime); source.start(nextStartTime); nextStartTime += buffer.duration` (`:296-310`). This is the standard jitter-free streaming-playback trick.
- **Cleanup** (`stopLiveSession`, `:156-187`): disconnects processor/source, closes both contexts, resets state. Called on unmount (`:146-150`).
- **State-in-refs gotcha**: `isLiveActiveRef`/`isMutedRef` mirror state (`:137-143`) because the `onaudioprocess` closure captures stale state otherwise (`:238-239`).

### SECURITY GOTCHA (important)
This Live session runs **client-side with a raw API key**: `new GoogleGenAI({ apiKey: process.env.API_KEY })` (`:196`), and `vite.config.ts:14-15` literally injects `GOOGLE_API_KEY` into `process.env.API_KEY` / `GEMINI_API_KEY` in the **browser bundle**. So the Gemini key is shipped to every client. Every *other* AI call is correctly server-side in Convex; this one is the exception and it's a real leak. (There are also signs voice mode was being disabled — comments "Voice mode disabled" at `:383`, `:574` — so it may be half-retired.)

### OpenAI-stack equivalents (as requested)
- **Record-then-process (simplest, cheapest):** capture with `MediaRecorder`, POST the blob to a server route, transcribe with **Whisper** (`whisper-1` / `gpt-4o-transcribe`), feed text to the normal agent, optionally TTS the reply (`tts-1` / `gpt-4o-mini-tts`). No streaming, no echo handling, no rate juggling. Best default for journaling brain-dumps.
- **True streaming (parity with this):** **OpenAI Realtime API** over WebRTC (browser) or WebSocket (server). WebRTC handles mic capture, Opus encoding, and playback for you — you don't hand-roll `ScriptProcessorNode` + PCM/base64 + AudioContext rate-matching at all. Crucially, use **ephemeral session tokens** minted server-side so the real key never reaches the browser (fixes the leak above). `input_audio_transcription` gives you the same live captions.
- **Modern note:** `ScriptProcessorNode` is deprecated; a rebuild should use `AudioWorkletNode` (or just let WebRTC do it).

### (c) Classification: **REBUILD** (keep the UX, change everything under it)
The UX — live captions of both sides, gapless audio playback, transcript folding into chat history on turn-complete — is excellent and worth replicating. The implementation is Gemini-Live-specific and leaks keys. Rebuild on OpenAI Realtime (WebRTC + ephemeral tokens) or Whisper-record-then-process depending on how "live" the journaling experience needs to feel.

### (d) How it informs "context-at-all-times"
Voice is just another **input channel** into the same agent. In LifeGuide, a voice brain-dump should land in the same intake pipeline (§6) and the same context bus (§11) as typed input — the modality shouldn't fork the intelligence layer.

---

## 5. Memory Compaction — `convex/ai/memory.ts`

### (a) What it does
`compactMemory` (`memory.ts:20`) is a Convex action that merges recent conversation turns into a single growing **long-term-memory text blob**, so the chat history can be truncated without losing context.

### (b) How it works — file:line + trigger
- **Trigger** (client-side, `ChatPanel.tsx:343-370`): after each agent reply, `if (finalHistory.length > 10)` → call `compactMemory({ currentMemory, messagesToCompact: <entire history> })`, then **keep only the last 5 messages** (`messagesToKeep = finalHistory.slice(-5)`, `:349`) and store the returned blob as `agentState.memory`.
- **The merge** (`memory.ts:36-53`): builds a transcript (`ROLE: text\n...`), feeds it + current memory to `AI_PROCESSES.memoryCompaction.buildPrompt(...)` (`models.ts:205-217`). The prompt is notable: *"Do NOT summarize into a tiny paragraph. Maintain a detailed, structured, chronological record."* — i.e. it **accretes detail rather than compressing**, the opposite of a typical summarizer. Returns rewritten memory text (or the old one on failure).
- **Storage**: persisted to `agentStates.context` (`schema.ts:109`) via `agentStates.updateAgentContext` (`agentStates.ts:119`). Re-injected into every agent call as `longTermMemory` (§2). There's also an unused alternate path `agentStates.compactConversationHistory` (`:212`) that keeps last-N + a summary prefix.
- **Display**: shown in the UI as a "Long Term Memory" amber box (`ChatPanel.tsx:467-473`).

### THE GAP (as flagged in the prompt)
Memory is **one unstructured, monotonically-growing string per pillar.** It is **not semantically indexed, not chunked, not embedded, not searchable.** Every call re-injects the *entire* blob regardless of relevance. The compaction prompt explicitly resists shrinking it, so over a long-lived pillar this blob grows unbounded and will eventually dominate (and overflow) the context window. There is no retrieval — it's "remember everything, send everything."

### (c) Classification: **REBUILD** (the concept is right, the storage is wrong)
Keep the idea of a durable per-user memory distinct from transient chat history. Rebuild as a **vector-indexed memory store**: chunk turns into atomic memories, embed them, store in Convex's vector index (Convex has native vector search) or a dedicated table, and **retrieve top-K relevant memories per call** instead of dumping the whole blob. Keep a small "always-on" profile/preferences summary for identity-level facts, and RAG the rest.

### (d) How it informs "context-at-all-times"
LifeGuide's memory must be **cross-surface and retrievable**: a journal reflection should be able to surface a relevant brain-dump note from 3 weeks ago. That requires embeddings + retrieval, not a per-pillar text blob. This is the single biggest upgrade over PillarOS for the "context-aware" promise.

---

## 6. Intake / Distillation — `convex/ai/analyze.ts`

### (a) What it does
Turns pasted/dropped raw content (text, link, image, file) into a clean, titled, structured item via a quick Gemini call. `analyzeIntakeItem` (`analyze.ts:21`) is the intake brain; `scanItem` (`:139`) is a deeper on-demand re-analysis of an existing item.

### (b) How it works — what it extracts
- **Routing by type** (`:50-69`): images → vision prompt + `inlineData{mimeType,data}` (base64 split from `data:image...`, `:54-60`); links → URL-summary prompt; text → cleanup-to-markdown prompt (truncated to 1000 chars, `:67`).
- **Prompts** (`models.ts:95-121`):
  - **image** → `{title, analysis, comments}` — title, OCR/description into `analysis`, and a suggested **type classification** (Receipt/Inspiration/Diagram) into `comments`.
  - **link** → `{title, comments}` — clean "Site — Article" title + 1-sentence guess at contents.
  - **text** → `{title, content}` — summary title + content reformatted to structured markdown.
- **Structured output** (`:75-88`): `responseMimeType:'application/json'` + a `responseSchema` (Type.OBJECT with title/content/analysis/comments). Guarantees parseable JSON.
- **Token accounting** (`:94-100`): every result gets a `tokenCount` via `estimateTokenCount` (`lib/tokenUtils.ts`) — feeds the per-pillar token budget UI.
- **Graceful degradation**: missing key or parse failure → returns original title/content with token count (`:33-42`, `:111-130`).
- **Client orchestration** (`App.tsx:420-477`): intake runs in a **review queue** — files upload to Convex storage first, AI enrichment runs in parallel per item (`enrichItemsInQueue`), and items are only committed to the board after the user approves in `IntakeModal`. Images keep their base64/blob; only their *description* goes to `analysis` (`App.tsx:447-456`). Triggered globally by a window `paste` listener (`App.tsx:499-613`).

### (c) Classification: **ADAPT**
The pattern is excellent and directly maps to LifeGuide's brain-dump surface: paste anything → AI distills to {title, clean content, analysis, suggested classification} → review → commit. Adapt by (1) swapping Gemini vision/JSON-mode for OpenAI structured outputs (`response_format: json_schema`) + vision, and (2) routing the distilled item into the context bus so other surfaces immediately see it.

### (d) How it informs "context-at-all-times"
Intake is the **front door** to context. Every distilled item should be immediately available to every surface's AI. The "distill on the way in" approach (clean title + extracted analysis at intake time) is what keeps the context payload compact later — do the summarization work once, at write time, not on every read.

---

## 7. AI Config Hub — `convex/ai/models.ts` (the `AI_PROCESSES` pattern)

### (a) What it does
**One file** centralizes the model name, generation parameters, and prompt templates for **all 8 AI processes** (`models.ts:33-316`). Self-described as "Single gateway into every AI process… Change a model, tweak a prompt, or tune parameters — all from this one file."

### (b) How it works
Each entry has `{ id, name, description, model, parameters: {temperature, maxOutputTokens, topP, topK} }` plus a prompt builder:
- `buildSystemPrompt(vars)` for chat agents (`ambientAgent` `:47`, `architectChat` `:158`),
- `buildPrompt(vars)` for one-shots (`pillarFinalization` `:175`, `memoryCompaction` `:205`, `alignmentAnalysis` `:233`, `itemScan` `:137`),
- static `prompts` map for intake (`intakeAnalysis` `:95`),
- `livePromptAdditions` for the audio session (`architectLiveAudio` `:309`).

`buildGenerationParams(processId)` (`:326-340`) strips `undefined` params so model defaults apply — every process currently leaves params `undefined`, deferring to model defaults. Action files import `{ AI_PROCESSES, buildGenerationParams }` and **never hardcode a model string** — verified across agent/analyze/architect/memory/tools.

The 8 processes: `ambientAgent`, `intakeAnalysis`, `itemScan`, `architectChat`, `pillarFinalization`, `memoryCompaction`, `alignmentAnalysis`, `architectLiveAudio`. Models span `gemini-3-flash-preview`, `gemini-2.5-flash`, `gemini-2.5-flash-preview-09-2025`, and `gemini-2.5-flash-native-audio-preview-12-2025`.

### (c) Classification: **REUSE** (this is the single best structural idea in the repo)
Port the `AI_PROCESSES` registry almost verbatim. It makes prompt iteration, model swaps, and A/B trivial, and it's the natural home for a **provider abstraction** — add a `provider: 'openai' | 'anthropic'` field per process so LifeGuide isn't locked the way PillarOS is to Gemini.

### (d) How it informs "context-at-all-times"
Centralized config is what keeps "every surface shares one intelligence layer" coherent: all surfaces draw their model/prompt config from one registry, so the agent behaves consistently everywhere and you can retune globally.

---

## 8. Convex Schema — `convex/schema.ts`

### (a) What it does
Defines 7 tables and their indexes. The data model is `User → Pillar → Zone → Item`, plus `agentStates` (memory + history), `artifacts` (saved AI outputs), `uiState`/`userSettings` (viewport/panels).

### (b) How it works — model, indexes, soft-delete, isolation
- **`users`** (`:6-11`): email/name/picture, `by_email` index. Guest-login lookup table (no password — email-as-identity).
- **`pillars`** (`:13-29`): `name, description, northStar?, icon?, missions?[{id,text,completed?}], color, order, isActive, userId`. Index `by_user`.
- **`zones`** (`:31-45`): `name, color (tailwind suffix), pillarId, order, isActive, position?{x,y}, dimensions?{w,h}`. Indexes `by_pillar`, `by_user`.
- **`items`** (`:47-100`): the big one — `type (text|link|image|file), title?, content, url?, analysis?, comments?`, rich metadata (`description, intent, priority, tokenCount, sourceType`), a **legacy `metadata` object** kept for migration (`:66-72`), file-storage fields (`fileId→_storage, fileUrl, fileName, fileSize, mimeType`), todo fields (`isTodo, completed, taskDescription`), and **spatial** fields (`pillarId, zoneId?, position{x,y,z}, dimensions?, tags[]`). Indexes `by_pillar`, `by_zone`, `by_user`.
- **`agentStates`** (`:102-114`): per-pillar `conversationHistory[{role,content,timestamp}]`, `context` (the memory blob), `lastInteraction`. Indexes `by_pillar`, `by_user`. (Note: this stores history, but in practice history lives client-side in `AgentState.chatHistory`; the persisted one is somewhat vestigial.)
- **`artifacts`** (`:149-175`): saved AI outputs as markdown — `title, content, type(document|prompt|config|code), derivedFrom?[{itemId,turnNumber?}], versions?[{content,createdAt}]`. Has provenance + versioning built in. Indexes `by_pillar`, `by_user`, `by_user_pillar`.
- **`uiState`** (`:132-147`) / **`userSettings`** (`:116-130`): viewport `{x,y,zoom}` + panel toggles, persisted per-pillar.
- **Soft-delete pattern**: every domain table has `isActive: boolean`; queries filter `.filter(q => q.eq(q.field("isActive"), true))`. `deletePillar` (`pillars.ts:97-140`) **cascades**: soft-deletes all the pillar's items, zones, and uiState in one mutation.
- **User isolation**: every table carries `userId: v.string()` with a `by_user` index; queries require `userId` (e.g. `getPillars` `pillars.ts:5-16` filters by user + active). The `userId` is the OAuth `sub` or guest email.

### (c) Classification: **ADAPT**
Reuse the conventions wholesale (soft-delete + `isActive`, `userId` isolation, `by_user`/`by_pillar` indexes, provenance+versions on artifacts, Convex `_storage` for files). **Drop the rigid hierarchy.** LifeGuide isn't Pillar→Zone→Item; it's a user with multiple **surfaces**. Restructure toward `surfaces` + `surfaceItems` (or per-surface tables) with a shared `userContext`/`memory` table, and add a **vector index** table for memory (§5).

### (d) How it informs "context-at-all-times"
The schema is where the context bus is *stored*. The key reusable convention: a single `userId`-isolated, soft-deleted store where the agent reads across tables on every call. Add: a `memories` table (embedded), and make the relationship "user → surfaces" not "pillar → zones → items."

---

## 9. Canvas — `components/Canvas.tsx` (1357 lines)

### (a) What it does
The spatial editor: pan/zoom, drag, multi-select (selection box), zone drag/resize, drag-to-snap-into-zone, drag-file-to-create, context menu, inline draft items. Pure client-side spatial UI on top of Convex data.

### (b) How it works — and how coupled is it?
- **Viewport model** (`Canvas.tsx:80-81`): `offset{x,y}` + `scale`. World↔screen transform: `world = (screen - offset) / scale` (`:180-181`), render via `translate(offset) scale(scale)`. Standard infinite-canvas math. Persisted to `uiState.viewport` (`:41-42, 137-139`).
- **The Pillar/Zone/Item coupling — where it bites:**
  - Canvas filters everything by pillar: `activeItems = items.filter(i => i.pillarId === currentPillar.id)` and same for zones (`:128-129`). **Pillar is baked into the render filter.**
  - **Zone-snap is the tightest coupling** (`:582-593`): during drag it computes `computeOverlapFraction(itemRect, zoneRect)` (`:8-23`) for each zone; if overlap ≥ **0.5** of the item's area and is the max, that zone becomes `hoveredZoneId`; on drop the item's `zoneId` is set (`:955`). So "an item belongs to a zone" is computed *spatially* — the Item↔Zone relationship is a side-effect of geometry.
  - Props are typed directly to `Item`/`Zone`/`Pillar` and the callbacks are item/zone-specific (`onAddZone`, `onUpdateZone`, `onUpdateItem` with `zoneId`, etc., `:24-52`).
- **Separability verdict:** The **pure spatial engine** (pan/zoom/offset/scale, world↔screen, selection box, drag, multi-select, overlap math) is cleanly separable — it's generic geometry with no domain knowledge. The **zone-snapping + pillar-filtering + zoneId-assignment** is *not* separable; it hard-encodes the Pillar→Zone→Item model into the drag lifecycle. Roughly: ~70% of Canvas is reusable spatial primitives, ~30% is the rigid-hierarchy glue.

### (c) Classification: **ADAPT** (extract the engine, drop the hierarchy glue)
For LifeGuide's **vision board**, lift the spatial engine (viewport transform, selection, drag, `computeOverlapFraction`) into a generic `<SpatialCanvas items renderItem onMove onGroup />` that knows nothing about pillars/zones. Replace zone-snap with a generic "grouping/cluster" concept the vision board defines. The brain-dump, journal, and roadmap surfaces likely don't need a canvas at all (list/doc UIs), so the canvas becomes *one surface's* renderer, not the app's backbone — which is the opposite of PillarOS where the canvas *is* the app.

### (d) How it informs "context-at-all-times"
Per §2, the spatial layout *is* context the AI can use. Whatever spatial engine LifeGuide keeps must still publish positions/groupings to the context bus, so the agent can reason "these vision-board images are clustered under 'Career'."

---

## 10. Architect Wizard — `convex/ai/architect.ts` + `PillarCreator.tsx` + `architectPrompts.ts`

### (a) What it does
A conversational onboarding flow that interviews the user to construct a new Pillar, enforcing 3 required fields (Name, North Star, Visual/icon) before allowing creation.

### (b) How it works — file:line
- **System prompt** (`architectPrompts.ts:16-33`): "You are the Pillar Architect… fill out 3 REQUIRED fields." Embeds a **goal-setting framework** (`:7-14`): *ask "Why?" three times; distinguish a finite Project from an ongoing Pillar; make the North Star aspirational-but-concrete (bad: "Get fit" / good: "Build a body capable of hiking the PCT by 2026").* This file is deliberately server-module-free so both client (live audio) and server import it.
- **Chat turn** (`architect.ts:20-85`): `chatWithArchitect` sends full history to `AI_PROCESSES.architectChat`, appends a JSON contract to the system prompt: `{"reply": "...", "checklist": {"hasName","hasNorthStar","hasIcon"}}` (`:56`). So **every turn returns both a message and a live readiness checklist.** temp=0.7, maxTokens=1000.
- **Checklist UI** (`PillarCreator.tsx:86-90, 507-521`): the three booleans render as a requirements bar; `handleFinalize` is gated on `allRequirementsMet` (`:475, 621`).
- **Finalization** (`architect.ts:91-152`): `generatePillarFromContext` runs `AI_PROCESSES.pillarFinalization` with JSON schema `{name, description, color, icon}` (`:117-126`), validates color is hex (`:137-139`), falls back to a default pillar on error. Result becomes a `CreatePillarInput`.
- **Context input**: a right-hand textarea (`PillarCreator.tsx:610-615`) lets the user paste raw notes/brain-dumps; this `contextData` is fed into both the chat (truncated 5000 chars, `models.ts:159`) and finalization (10000 chars, `models.ts:182`).

### (c) Classification: **ADAPT**
The pattern — **conversational setup that emits a live structured checklist and gates completion on it** — is broadly reusable and great UX. For LifeGuide, reuse it for onboarding (establishing the user's overarching North Star / life context) rather than per-pillar creation. The goal-setting framework prompt is genuinely good content; keep it.

### (d) How it informs "context-at-all-times"
The architect is how LifeGuide can **bootstrap the global context** at onboarding: the same "interview → structured output" flow can populate the initial roadmap, north star, and seed the memory store — establishing the baseline context every surface will then build on.

---

## 11. ⭐ THE CONTEXT BUS — the central deliverable

> **Goal:** every surface (brain dump, vision board, journal, roadmap) publishes its current state to one place, so that *every* AI call sees the full picture, and any surface can contribute tools that mutate any part of that picture.

### Seed pattern (what PillarOS already proves works)
PillarOS demonstrates the core mechanic at single-surface scale:
1. **Server-side assembly** — context is rebuilt from the DB on every call, never trusted from the client (`agent.ts:88-98`).
2. **One serializer** — `generateBoardContext()` turns rows into resolved JSON with IDs first-class (`agent.ts:21-65`).
3. **One injection point** — that JSON + long-term memory go into the system prompt via a centralized builder (`models.ts:47-79`).
4. **One tool registry** — `getAvailableTools()` exposes every mutation the agent can make (`tools.ts:915`).
5. **Optional scoping** — `selectedItemIds` narrows the payload for focus/token budget (`agent.ts:29`).

LifeGuide's job is to **generalize "the board" → "the user's whole world."**

### Proposed architecture

**A. Publisher interface (each surface implements it)**
```ts
interface ContextPublisher {
  surface: 'brainDump' | 'visionBoard' | 'journal' | 'roadmap';
  // Cheap, structured snapshot of this surface's current state, ID-first, resolved.
  snapshot(userId: string, opts: { detail: 'summary' | 'full'; budget?: number }): Promise<SurfaceSnapshot>;
  // Tools this surface contributes to the global agent.
  tools(): Tool[];
}
```
Each surface owns its `snapshot()` (its `generateBoardContext` equivalent) and its `tools()`. Adding the journal later = implement one interface; the agent gains journal-awareness and journal-tools with **zero** agent code changes.

**B. The aggregator (one function, the generalized `generateBoardContext`)**
```ts
async function assembleUserContext(userId, { focusSurface, tokenBudget }) {
  const memory = await retrieveRelevantMemories(userId, /* query */, K); // §5 — RAG, not a blob
  const snapshots = await Promise.all(
    registeredSurfaces.map(s =>
      s.snapshot(userId, {
        detail: s.surface === focusSurface ? 'full' : 'summary',   // full detail for active surface, summaries for the rest
        budget: budgetFor(s.surface, tokenBudget),
      })
    )
  );
  return {
    meta: { userId, timestamp, northStar, activeSurface: focusSurface, longTermMemory: memory },
    surfaces: Object.fromEntries(snapshots.map(s => [s.surface, s.payload])),
  };
}
```
Key upgrades over PillarOS's serializer:
- **Multi-surface** rather than single-board.
- **Tiered detail** (full for the focused surface, summaries for the rest) — solves PillarOS's "stuff everything untruncated" cost problem.
- **RAG memory** instead of a monotonic text blob.
- **Token budget** as a first-class arg (PillarOS only had the binary `selectedItemIds` filter + token *estimation*, no enforced budget).

**C. The agent endpoint (generalized `getAmbientAgentResponse`)**
- Server action, fetches `assembleUserContext`, injects into system prompt, attaches `globalToolRegistry`.
- **Real multi-turn loop** (the fix from §1): model → tool calls → execute → feed results back as `tool` messages → re-call until no tool calls (cap ~5). On OpenAI this is native.
- Returns text + rich-data (keep PillarOS's `{success,message,...richData}` contract from §3 so surfaces can render interactive results).

**D. Storage (Convex)**
- `userContext` / `memories` table (embedded, vector-indexed) — the durable cross-surface memory.
- Per-surface tables (or a `surfaceItems` table discriminated by `surface`) following PillarOS's soft-delete + `userId` isolation conventions.
- A surface's `snapshot()` reads its own table(s); the aggregator stitches them.

### Why this is the right generalization
PillarOS's `generateBoardContext` already treats context as **"resolve the DB into ID-first JSON and inject it whole."** The only thing pillar-specific about it is the *shape* (items/zones) and the *scope* (one pillar). Swap the shape for a `surfaces` map and the scope for "all of a user's surfaces," add tiering + RAG for cost, and you have the context bus. The publisher/registry split means surfaces are **plugins**: the intelligence layer is fixed; surfaces opt into it.

---

## 12. Auth — Google OAuth + Guest email

### (a) What it does
Two paths: Google OAuth (real) and guest-by-email (frictionless testing). Identity = a `userId` string used for all data isolation.

### (b) How it works — file:line
- **Google** (`LoginScreen.tsx:2,85` + `App.tsx:366-376`): `@react-oauth/google`'s `<GoogleLogin>` returns a credential JWT; `handleLoginSuccess` does `jwtDecode<UserProfile>(credential)`, stores it in `localStorage['pillar_auth_token']`, and uses the decoded `sub` as `userId` (`pillars.getPillars({ userId: user.sub })`, `App.tsx:78`).
- **Guest** (`App.tsx:380-396`): email → `users.getUserByEmail` lookup (`convex/users.ts:5`, `by_email` index, lowercased/trimmed); token stored as `"pillar_guest_token:email@example.com"` (`App.tsx:395`).
- **Rehydration** (`App.tsx:192-220`): on load, parse `localStorage` token — guest form (`prefix:email`) re-looks-up the user; JWT form is decoded. Bad token → cleared.
- **Init** (`App.tsx:242-254`): `initializeUser({ userId, selectedPillarIds })` seeds default pillars for new users.
- **Client-side only**: there's no server-side session/JWT verification — `userId` is taken on faith from the client. Fine for a demo, **not** for production data isolation.

### (c) Classification: **DROP / REBUILD**
Don't carry over hand-rolled `localStorage` JWT + email-lookup-guest with no server verification. Use **Convex Auth** (or Clerk/Auth.js) for verified sessions and a real server-trusted `userId`. Keep the *idea* of a low-friction guest mode if useful, but back it with proper anonymous sessions.

### (d) How it informs "context-at-all-times"
The verified `userId` is the partition key for the entire context bus — every snapshot, memory, and tool call is scoped to it. Getting real auth right is a prerequisite for trusting cross-surface context server-side.

---

## 13. Summary tables

### Classification at a glance
| Area | File(s) | Verdict | One-line why |
|------|---------|---------|--------------|
| Board-context injection | `agent.ts:21-65` | **REUSE pattern / REBUILD impl** | The core value prop; generalize to multi-surface + tiered + RAG. |
| AI config hub (`AI_PROCESSES`) | `models.ts` | **REUSE** | Best structural idea here; add a provider field to de-Gemini it. |
| Tool framework | `tools.ts` | **ADAPT** | Great rich-data contract; replace single-file switch with a typed per-surface registry. |
| Ambient agent loop | `agent.ts:71-159` | **ADAPT** | Right shape, but it's single-pass — add a real multi-turn tool loop. |
| Intake/distillation | `analyze.ts` | **ADAPT** | Perfect for brain-dump; swap to OpenAI structured outputs. |
| Memory compaction | `memory.ts` | **REBUILD** | Concept good, storage wrong — needs embeddings + retrieval, not a growing blob. |
| Live audio | `PillarCreator.tsx` | **REBUILD** | Keep the UX; rebuild on OpenAI Realtime/Whisper + ephemeral tokens (current code leaks the key). |
| Architect wizard | `architect.ts`, `architectPrompts.ts` | **ADAPT** | Reuse "conversational setup → live checklist → gated finalize" for onboarding. |
| Schema / data model | `schema.ts` | **ADAPT** | Keep soft-delete + userId isolation + artifacts versioning; drop Pillar→Zone→Item rigidity. |
| Canvas spatial engine | `Canvas.tsx` | **ADAPT** | Extract the generic viewport/drag/overlap engine; drop zone/pillar glue. |
| Auth | `App.tsx`, `users.ts`, `LoginScreen.tsx` | **DROP/REBUILD** | Client-trusted localStorage JWT — use Convex Auth/Clerk. |

### Top 5 things to definitely take
1. **`generateBoardContext()` philosophy** (`agent.ts:21-65`) — resolve the DB into ID-first JSON and inject it whole into the system prompt. This *is* "AI sees everything." Generalize it into the context bus (§11).
2. **`AI_PROCESSES` config hub** (`models.ts`) — one file owns every model/prompt/param. Port nearly verbatim; add a `provider` field.
3. **The tool definition + dispatch + rich-data-return contract** (`tools.ts`) — tools return `{success, message, ...richData}` so the client renders interactive UI, not just text. Rebuild dispatch as a typed per-surface registry.
4. **Server-side AI with DB-rebuilt context** (`agent.ts:88-98`) — never trust client context; refetch from DB each call. Security + freshness in one move.
5. **Intake distill-on-write** (`analyze.ts` + `App.tsx` review queue) — paste anything → AI cleans/titles/classifies → review → commit, with token accounting. The "summarize at write time" discipline keeps later context payloads cheap.

### Top 3 to leave behind
1. **Single growing text-blob memory** (`memory.ts`) — unindexed, monotonic, re-sent whole every call; will overflow context. Replace with embedded + retrieved memories.
2. **The rigid Pillar→Zone→Item hierarchy + canvas-as-the-app** (`schema.ts`, `Canvas.tsx`) — LifeGuide is multi-surface; the canvas is at most *one* surface, not the backbone.
3. **Client-trusted localStorage-JWT auth** (`App.tsx`) — no server verification; use a real auth provider.

### Key gotchas
- **Gemini-locked.** Every AI call uses `@google/genai` with Gemini-specific constructs: `FunctionDeclaration` + `Type.*` enums (`tools.ts`), `ai.live.connect` + PCM/`Modality.AUDIO` (`PillarCreator.tsx`), `responseMimeType`/`responseSchema` (`analyze.ts`), `gemini-*` model strings (`models.ts`). Porting to OpenAI touches every AI file — schemas → Zod/JSON-schema, tool format → `tools`/`tool_calls`, live → Realtime API, JSON mode → `response_format`.
- **API key leaks to the browser.** `vite.config.ts:14-15` injects `GOOGLE_API_KEY` into the client bundle (`process.env.API_KEY`), consumed by `PillarCreator.tsx:196` for the Live session. Every other call is correctly server-side in Convex; this one is the exception and a real secret leak. Use ephemeral/server-minted tokens in the rebuild.
- **The agent loop is single-pass, not agentic.** Despite the framing, there's no tool-result feedback to the model (`agent.ts:128-147`). The "loop" is cosmetic client-side text appending (`ChatPanel.tsx:309-330`). LifeGuide needs a true multi-turn loop.
- **It IS git-tracked, with uncommitted changes.** Remote `github.com/anurieli/PillarOS.git`; `App.tsx`, `Layout.tsx`, `PillarCreator.tsx`, `architect.ts` are dirty on disk vs last commit `2b7af07`. Read disk.
- **Counts are off in the docs.** CLAUDE.md says "12 tools" / "6 AI processes"; reality is **11 tools** (`tools.ts:915`) and **8 processes** (`models.ts`). Trust the code.
- **Voice mode appears half-disabled.** "Voice mode disabled" comments at `PillarCreator.tsx:383,574` suggest the Live feature was being retired even before this extraction.
- **`scanItem` looks buggy.** `analyze.ts:150` calls `ctx.runQuery(ctx.db.get as any, args.itemId)` — that's not a valid Convex query reference and would throw. Treat as untested/dead.
- **No semantic search anywhere.** `search_items` (`tools.ts:660`) is naive substring matching; memory has no retrieval. The "context-aware" promise in PillarOS is achieved by brute-force whole-state injection, which doesn't scale — embeddings are the missing primitive for LifeGuide.
