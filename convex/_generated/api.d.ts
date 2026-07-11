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
import type * as ai_distill from "../ai/distill.js";
import type * as ai_imageGen from "../ai/imageGen.js";
import type * as ai_ingest from "../ai/ingest.js";
import type * as ai_openai from "../ai/openai.js";
import type * as ai_parse from "../ai/parse.js";
import type * as ai_splitDump from "../ai/splitDump.js";
import type * as ai_synthesizeInterview from "../ai/synthesizeInterview.js";
import type * as ai_voice_index from "../ai/voice/index.js";
import type * as ai_voice_openaiRealtime from "../ai/voice/openaiRealtime.js";
import type * as ai_voice_provider from "../ai/voice/provider.js";
import type * as aiKeys from "../aiKeys.js";
import type * as auth from "../auth.js";
import type * as brainDumps from "../brainDumps.js";
import type * as captures from "../captures.js";
import type * as center from "../center.js";
import type * as coach from "../coach.js";
import type * as context_assemble from "../context/assemble.js";
import type * as context_types from "../context/types.js";
import type * as core from "../core.js";
import type * as coreFiles from "../coreFiles.js";
import type * as edges from "../edges.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as interactions from "../interactions.js";
import type * as interview from "../interview.js";
import type * as lib_transcript from "../lib/transcript.js";
import type * as messages from "../messages.js";
import type * as mirror from "../mirror.js";
import type * as nodes from "../nodes.js";
import type * as owner from "../owner.js";
import type * as pillars from "../pillars.js";
import type * as placement from "../placement.js";
import type * as settings from "../settings.js";
import type * as surfaces from "../surfaces.js";
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
  "ai/distill": typeof ai_distill;
  "ai/imageGen": typeof ai_imageGen;
  "ai/ingest": typeof ai_ingest;
  "ai/openai": typeof ai_openai;
  "ai/parse": typeof ai_parse;
  "ai/splitDump": typeof ai_splitDump;
  "ai/synthesizeInterview": typeof ai_synthesizeInterview;
  "ai/voice/index": typeof ai_voice_index;
  "ai/voice/openaiRealtime": typeof ai_voice_openaiRealtime;
  "ai/voice/provider": typeof ai_voice_provider;
  aiKeys: typeof aiKeys;
  auth: typeof auth;
  brainDumps: typeof brainDumps;
  captures: typeof captures;
  center: typeof center;
  coach: typeof coach;
  "context/assemble": typeof context_assemble;
  "context/types": typeof context_types;
  core: typeof core;
  coreFiles: typeof coreFiles;
  edges: typeof edges;
  feedback: typeof feedback;
  files: typeof files;
  http: typeof http;
  interactions: typeof interactions;
  interview: typeof interview;
  "lib/transcript": typeof lib_transcript;
  messages: typeof messages;
  mirror: typeof mirror;
  nodes: typeof nodes;
  owner: typeof owner;
  pillars: typeof pillars;
  placement: typeof placement;
  settings: typeof settings;
  surfaces: typeof surfaces;
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
