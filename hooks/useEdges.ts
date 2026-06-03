import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useEdges(surfaceId: Id<"surfaces"> | null) {
  const edges = useQuery(api.edges.list, surfaceId ? { surfaceId } : "skip");
  return {
    edges: edges ?? [],
    connect: useMutation(api.edges.connect),
    setLabel: useMutation(api.edges.setLabel),
    remove: useMutation(api.edges.remove),
  };
}
