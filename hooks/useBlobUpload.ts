"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/** Upload one blob to Convex storage via a signed URL; returns the storage id. */
export function useBlobUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  return useCallback(
    async (blob: Blob, contentType: string): Promise<Id<"_storage">> => {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      const { storageId } = await res.json();
      return storageId as Id<"_storage">;
    },
    [generateUploadUrl],
  );
}
