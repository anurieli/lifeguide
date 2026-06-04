import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCaptures() {
  const inbox = useQuery(api.captures.inbox, {});
  return {
    inbox: inbox ?? [],
    loading: inbox === undefined,
    create: useMutation(api.captures.create),
    softDelete: useMutation(api.captures.softDelete),
    place: useMutation(api.placement.placeCapture),
    generateUploadUrl: useMutation(api.files.generateUploadUrl),
    /** Brain-dump: transcribe a spoken dump, split into thoughts, create captures, return IDs. */
    brainDump: useAction(api.voice.brainDump),
  };
}
