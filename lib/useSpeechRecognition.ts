"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in the default TS DOM lib).
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = { 0: SpeechRecognitionAlternative; isFinal: boolean; length: number };
type SpeechRecognitionResultList = { length: number; [i: number]: SpeechRecognitionResult };
type SpeechRecognitionEvent = { resultIndex: number; results: SpeechRecognitionResultList };
type SpeechRecognitionErrorEvent = { error: string };
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechState = {
  /** Whether this browser can do live transcription at all. False → caller should fall back to typing. */
  supported: boolean;
  listening: boolean;
  /** Committed words so far. */
  finalText: string;
  /** The in-flight, not-yet-final words (shown ghosted live). */
  interim: string;
  /** A non-fatal error code from the API, if any (e.g. "no-speech", "not-allowed"). */
  error: string | null;
  start: () => void;
  /** Stop listening; returns the full final transcript captured. */
  stop: () => string;
  reset: () => void;
};

/**
 * Thin React wrapper over the browser's Web Speech API for live, on-device dictation.
 * No audio leaves the machine; transcription is free and live. Where unsupported
 * (`supported === false`), the consumer should simply offer typing instead.
 */
export function useSpeechRecognition(lang = "en-US"): SpeechState {
  const [supported] = useState(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  // Whether the user means to be listening — lets us auto-restart on the API's idle `onend`.
  const wantRef = useRef(false);

  const ensure = useCallback((): SpeechRecognitionLike | null => {
    if (recRef.current) return recRef.current;
    const Ctor = getCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interimStr = "";
      let appended = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0]?.transcript ?? "";
        if (r.isFinal) appended += txt;
        else interimStr += txt;
      }
      if (appended) {
        finalRef.current = (finalRef.current + appended).replace(/\s+/g, " ");
        setFinalText(finalRef.current.trim());
      }
      setInterim(interimStr.trim());
    };
    rec.onerror = (e) => {
      // "no-speech"/"aborted" are routine; surface only the actionable ones.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError(e.error);
        wantRef.current = false;
        setListening(false);
      }
    };
    rec.onend = () => {
      // The engine times out periodically; if the user still wants to listen, restart.
      if (wantRef.current) {
        try {
          rec.start();
        } catch {
          /* already starting */
        }
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    return rec;
  }, [lang]);

  const start = useCallback(() => {
    const rec = ensure();
    if (!rec) return;
    finalRef.current = "";
    setFinalText("");
    setInterim("");
    setError(null);
    wantRef.current = true;
    setListening(true);
    try {
      rec.start();
    } catch {
      /* start() throws if already running — fine */
    }
  }, [ensure]);

  const stop = useCallback((): string => {
    wantRef.current = false;
    setListening(false);
    recRef.current?.stop();
    // Fold any trailing interim words into the final result the caller receives.
    const full = (finalRef.current + " " + interim).replace(/\s+/g, " ").trim();
    return full;
  }, [interim]);

  const reset = useCallback(() => {
    finalRef.current = "";
    setFinalText("");
    setInterim("");
    setError(null);
  }, []);

  // Clean up the recognizer if the component unmounts mid-listen.
  useEffect(() => {
    return () => {
      wantRef.current = false;
      recRef.current?.abort();
    };
  }, []);

  return { supported, listening, finalText, interim, error, start, stop, reset };
}
