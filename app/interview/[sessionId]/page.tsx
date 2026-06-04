"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// ─── Inner page (needs Suspense boundary for useSearchParams) ─────────────────

function PhoneInterviewInner() {
  const params = useParams();
  const searchParams = useSearchParams();

  const sessionId = params.sessionId as Id<"interviewSessions">;
  const token = searchParams.get("t") ?? "";

  const [markedJoined, setMarkedJoined] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [done, setDone] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const markJoined = useMutation(api.interview.markJoined);
  const appendTurnByToken = useMutation(api.interview.appendTurnByToken);
  const endByToken = useMutation(api.interview.endByToken);

  // joinWithToken is a query — returns the safe session view or throws on bad token.
  // We pass undefined args until we have both values to avoid a premature throw.
  const session = useQuery(
    api.interview.joinWithToken,
    sessionId && token ? { sessionId, token } : "skip",
  );

  // Mark joined once on first successful session load.
  useEffect(() => {
    if (session && !markedJoined) {
      setMarkedJoined(true);
      markJoined({ sessionId, token }).catch(() => {});
    }
  }, [session, markedJoined, sessionId, token, markJoined]);

  // Auto-scroll transcript.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.transcript]);

  // No token provided.
  if (!token) {
    return (
      <PageWrap>
        <p className="text-[15px] text-ink-soft text-center">
          This link is missing a session token. Open the QR code from your desktop session.
        </p>
      </PageWrap>
    );
  }

  // Loading.
  if (session === undefined) {
    return (
      <PageWrap>
        <p className="text-[14px] text-ink-mute text-center animate-pulse">
          Connecting to your session…
        </p>
      </PageWrap>
    );
  }

  // Invalid / expired token — session is null (query threw).
  if (session === null) {
    return (
      <PageWrap>
        <p className="text-[15px] text-ink-soft text-center">
          This session link has expired or is invalid. Please rescan the QR code from your desktop.
        </p>
      </PageWrap>
    );
  }

  if (done || session.status !== "active") {
    return (
      <PageWrap>
        <p className="text-[15px] text-ink-soft text-center">
          This session is complete. You can close this tab.
        </p>
      </PageWrap>
    );
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await appendTurnByToken({ sessionId, token, role: "user", text: trimmed });
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function endSession() {
    if (ending) return;
    setEnding(true);
    try {
      await endByToken({ sessionId, token, status: "completed" });
      setDone(true);
    } catch {
      setEnding(false);
    }
  }

  return (
    <PageWrap>
      <h1 className="text-[17px] font-medium text-ink tracking-tight mb-1">
        Your interview
      </h1>
      <p className="text-[12px] text-ink-mute mb-4">
        Answering on your phone. Responses appear live on your desktop too.
      </p>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto rounded-[14px] bg-card border border-line p-4 flex flex-col gap-3 min-h-0 mb-4">
        {session.transcript && session.transcript.length > 0 ? (
          session.transcript.map((turn, i) => (
            <div
              key={i}
              className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  turn.role === "coach"
                    ? "bg-coach text-coach-ink"
                    : "bg-ink text-white"
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[14px] text-ink-mute text-center m-auto">
            The coach will speak first. Type your replies below.
          </p>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Text input */}
      <div className="flex gap-2 mb-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Your answer…"
          rows={2}
          className="flex-1 resize-none rounded-[12px] bg-card border border-line px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-mute focus:outline-none focus:border-gold"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={!text.trim() || sending}
          className="self-end rounded-xl px-4 py-[11px] text-[14px] bg-ink text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>

      {/* End button */}
      <button
        onClick={() => void endSession()}
        disabled={ending}
        className="w-full rounded-xl px-4 py-[11px] text-[14px] bg-card border border-line text-ink hover:border-gold disabled:opacity-40"
      >
        {ending ? "Ending…" : "End interview"}
      </button>

      {/* Concern note (dev only): voice on phone is deferred — see task notes */}
    </PageWrap>
  );
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-start px-5 pt-12 pb-8">
      <div className="w-full max-w-md flex flex-col flex-1">{children}</div>
    </div>
  );
}

// ─── Default export with Suspense boundary ────────────────────────────────────

export default function PhoneInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <p className="text-[14px] text-ink-mute animate-pulse">Loading…</p>
        </div>
      }
    >
      <PhoneInterviewInner />
    </Suspense>
  );
}
