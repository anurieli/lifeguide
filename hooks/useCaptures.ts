import { useMutation, useQuery } from "convex/react";
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
  };
}
