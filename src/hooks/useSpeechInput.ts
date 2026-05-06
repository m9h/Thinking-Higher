"use client";
import { useRef, useState, useCallback } from "react";
import { fetchSTTTranscript } from "@/lib/speech";

// Only two visible states — "processing" is silent/internal
export type SpeechInputState = "idle" | "listening";

export interface UseSpeechInputReturn {
  state: SpeechInputState;
  interimText: string;           // "Listening…" shown while recording
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  onTranscript: (cb: (text: string) => void) => void;
}

export function useSpeechInput(): UseSpeechInputReturn {
  const [state, setState]             = useState<SpeechInputState>("idle");
  const [interimText, setInterimText] = useState("");
  const processingRef    = useRef(false);   // internal guard — prevents double-start
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const callbackRef      = useRef<((text: string) => void) | null>(null);
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef     = useRef<number | null>(null);

  const supported = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const onTranscript = useCallback((cb: (text: string) => void) => {
    callbackRef.current = cb;
  }, []);

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (animFrameRef.current)    cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle" || processingRef.current) return;
    chunksRef.current = [];
    setInterimText("Listening…");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setInterimText("");
      return;
    }

    const ctx      = new AudioContext();
    const source   = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArr = new Uint8Array(analyser.frequencyBinCount);

    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => stopRecording(), 1500);
    };

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArr);
      const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
      if (avg > 8) resetSilenceTimer();
      animFrameRef.current = requestAnimationFrame(checkLevel);
    };
    resetSilenceTimer();
    animFrameRef.current = requestAnimationFrame(checkLevel);

    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      // Return to idle immediately — STT happens silently in background
      setState("idle");
      setInterimText("");
      processingRef.current = true;
      try {
        const blob       = new Blob(chunksRef.current, { type: "audio/webm" });
        const transcript = await fetchSTTTranscript(blob);
        if (transcript && callbackRef.current) callbackRef.current(transcript);
      } catch (e) {
        console.error("STT error:", e);
      } finally {
        processingRef.current = false;
      }
    };

    mr.start();
    setState("listening");
  }, [state, stopRecording]);

  return { state, interimText, supported, start, stop: stopRecording, onTranscript };
}
