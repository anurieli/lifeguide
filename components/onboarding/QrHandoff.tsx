"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import QRCode from "qrcode";

export function QrHandoff({ sessionId }: { sessionId: Id<"interviewSessions"> }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const issued = useRef(false);

  const issueJoinToken = useMutation(api.interview.issueJoinToken);

  useEffect(() => {
    if (issued.current) return;
    issued.current = true;

    (async () => {
      try {
        const { token } = await issueJoinToken({ sessionId });
        const url = `${window.location.origin}/interview/${sessionId}?t=${token}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 1,
          color: { dark: "#1a1f2e", light: "#f5f4f0" },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not generate QR code.");
      }
    })();
  }, [sessionId, issueJoinToken]);

  if (error) {
    return (
      <p className="text-[12px] text-ink-mute text-center">
        Could not generate link.
      </p>
    );
  }

  if (!qrDataUrl) {
    return (
      <p className="text-[12px] text-ink-mute text-center animate-pulse">
        Generating link…
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={qrDataUrl}
        alt="Scan to continue on your phone"
        className="w-[100px] h-[100px] rounded-[8px]"
      />
      <p className="text-[11px] text-ink-mute tracking-wide">
        Continue on your phone.
      </p>
    </div>
  );
}
