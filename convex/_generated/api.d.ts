/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai_config from "../ai/config.js";
import type * as ai_dailyQuote from "../ai/dailyQuote.js";
import type * as ai_distill from "../ai/distill.js";
import type * as ai_imageGen from "../ai/imageGen.js";
import type * as ai_ingest from "../ai/ingest.js";
import type * as ai_openai from "../ai/openai.js";
import type * as ai_parse from "../ai/parse.js";
import type * as ai_sessionDigest from "../ai/sessionDigest.js";
import type * as ai_splitDump from "../ai/splitDump.js";
import type * as ai_synthesizeInterview from "../ai/synthesizeInterview.js";
import type * as ai_voice_index from "../ai/voice/index.js";
import type * as ai_voice_openaiRealtime from "../ai/voice/openaiRealtime.js";
import type * as ai_voice_provider from "../ai/voice/provider.js";
import type * as aiKeys from "../aiKeys.js";
import type * as aiLogs from "../aiLogs.js";
import type * as aiModels from "../aiModels.js";
import type * as auth from "../auth.js";
import type * as blueprintDoc from "../blueprintDoc.js";
import type * as captures from "../captures.js";
import type * as center from "../center.js";
import type * as coach from "../coach.js";
import type * as context_assemble from "../context/assemble.js";
import type * as context_types from "../context/types.js";
import type * as core from "../core.js";
import type * as coreFiles from "../coreFiles.js";
import type * as dailyTidbits from "../dailyTidbits.js";
import type * as edges from "../edges.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as goals from "../goals.js";
import type * as horizons from "../horizons.js";
import type * as http from "../http.js";
import type * as interactions from "../interactions.js";
import type * as interview from "../interview.js";
import type * as lib_transcript from "../lib/transcript.js";
import type * as linear from "../linear.js";
import type * as messages from "../messages.js";
import type * as mirror from "../mirror.js";
import type * as morningNote from "../morningNote.js";
import type * as nodes from "../nodes.js";
import type * as owner from "../owner.js";
import type * as pillars from "../pillars.js";
import type * as placement from "../placement.js";
import type * as rituals from "../rituals.js";
import type * as roadmap from "../roadmap.js";
import type * as sessions from "../sessions.js";
import type * as settings from "../settings.js";
import type * as surfaces from "../surfaces.js";
import type * as todoist from "../todoist.js";
import type * as users from "../users.js";
import type * as voice from "../voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "ai/config": typeof ai_config;
  "ai/dailyQuote": typeof ai_dailyQuote;
  "ai/distill": typeof ai_distill;
  "ai/imageGen": typeof ai_imageGen;
  "ai/ingest": typeof ai_ingest;
  "ai/openai": typeof ai_openai;
  "ai/parse": typeof ai_parse;
  "ai/sessionDigest": typeof ai_sessionDigest;
  "ai/splitDump": typeof ai_splitDump;
  "ai/synthesizeInterview": typeof ai_synthesizeInterview;
  "ai/voice/index": typeof ai_voice_index;
  "ai/voice/openaiRealtime": typeof ai_voice_openaiRealtime;
  "ai/voice/provider": typeof ai_voice_provider;
  aiKeys: typeof aiKeys;
  aiLogs: typeof aiLogs;
  aiModels: typeof aiModels;
  auth: typeof auth;
  blueprintDoc: typeof blueprintDoc;
  captures: typeof captures;
  center: typeof center;
  coach: typeof coach;
  "context/assemble": typeof context_assemble;
  "context/types": typeof context_types;
  core: typeof core;
  coreFiles: typeof coreFiles;
  dailyTidbits: typeof dailyTidbits;
  edges: typeof edges;
  feedback: typeof feedback;
  files: typeof files;
  goals: typeof goals;
  horizons: typeof horizons;
  http: typeof http;
  interactions: typeof interactions;
  interview: typeof interview;
  "lib/transcript": typeof lib_transcript;
  linear: typeof linear;
  messages: typeof messages;
  mirror: typeof mirror;
  morningNote: typeof morningNote;
  nodes: typeof nodes;
  owner: typeof owner;
  pillars: typeof pillars;
  placement: typeof placement;
  rituals: typeof rituals;
  roadmap: typeof roadmap;
  sessions: typeof sessions;
  settings: typeof settings;
  surfaces: typeof surfaces;
  todoist: typeof todoist;
  users: typeof users;
  voice: typeof voice;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
