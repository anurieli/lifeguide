"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { withRetry } from "@/lib/withRetry";

/**
 * Upload one blob to Convex storage via a signed URL; returns the storage id.
 * Both hops are retried: `generateUploadUrl` can throw "Not authenticated" during
 * the cold-start auth-token settle (see lib/withRetry.ts), and the signed-URL POST
 * can hit a transient network blip. Nothing is written until the POST succeeds, so
 * a retry never duplicates a file.
 */
export function useBlobUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  return useCallback(
    async (blob: Blob, contentType: string): Promise<Id<"_storage">> => {
      return withRetry(async () => {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: blob,
        });
        if (!res.ok) throw new Error(`upload failed: ${res.status}`);
        const { storageId } = await res.json();
        return storageId as Id<"_storage">;
      });
    },
    [generateUploadUrl],
  );
}
