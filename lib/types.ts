import { Doc, Id } from "@/convex/_generated/dataModel";

export type NodeDoc = Doc<"nodes">;
export type EdgeDoc = Doc<"edges">;
export type CaptureDoc = Doc<"captures">;
export type Viewport = { x: number; y: number; scale: number };
export type SurfaceId = Id<"surfaces">;
export type NodeId = Id<"nodes">;
