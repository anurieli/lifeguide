import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useNodes(surfaceId: Id<"surfaces"> | null) {
  const nodes = useQuery(api.nodes.list, surfaceId ? { surfaceId } : "skip");
  return {
    nodes: nodes ?? [],
    loading: nodes === undefined,
    create: useMutation(api.nodes.create),
    move: useMutation(api.nodes.move),
    resize: useMutation(api.nodes.resize),
    setText: useMutation(api.nodes.setText),
    setPillars: useMutation(api.nodes.setPillars),
    remove: useMutation(api.nodes.remove),
  };
}
