import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Mic, MicOff, Phone, PhoneOff, Play, Send, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/speech";
import type { DirectMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AgentAvatar from "@/components/AgentAvatar";
import DataRegionState from "@/components/DataRegionState";
import ActionErrorNotice from "@/components/ActionErrorNotice";

// Minimal typings for the Web Speech API (not in the DOM lib).
type SRResultItem = { 0: { transcript: string }; isFinal: boolean };
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { resultIndex: number; results: { length: number; [index: number]: SRResultItem } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRCtor = new () => SpeechRecognitionLike;

const SR: SRCtor | undefined =
  typeof window !== "undefined"
    ? ((window as unknown as Record<string, SRCtor | undefined>).webkitSpeechRecognition ??
      (window as unknown as Record<string, SRCtor | undefined>).SpeechRecognition)
    : undefined;

const INTENT_STYLE: Record<string, string> = {
  explicando: "bg-slate-100 text-slate-600 border-slate-200",
  propondo: "bg-amber-50 text-amber-800 border-amber-200",
  executando: "bg-blue-600 text-white border-blue-600",
};

export default function ZeroDirect() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [callMode, setCallMode] = useState(false);
  const [params, setParams] = useSearchParams();
  const wantsCall = params.get("call") === "1" && !callMode; // opened from the home-screen shortcut
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const callRef = useRef(false);
  const waitingRef = useRef(false); // call mode: sent, waiting for Zero

  const zeroQuery = useQuery({
    queryKey: ["zero"],
    queryFn: () => apiGet<DirectMessage[]>("/zero/messages"),
    refetchInterval: callMode ? 1200 : 2000,
  });
  const messages = zeroQuery.data;
  const list = messages ?? [];
  const thinking = list.length > 0 && list[list.length - 1].role === "user";

  const send = useMutation({
    mutationFn: (content: string) => apiPost<DirectMessage>("/zero/chat", { content }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["zero"] });
    },
    onError: () => {
      waitingRef.current = false;
      toast.error(t("common.error"));
    },
  });
  const sendRef = useRef(send.mutate);
  sendRef.current = send.mutate;

  const execute = useMutation({
    mutationFn: (id: string) => apiPost<DirectMessage>(`/zero/messages/${id}/execute`),
    onSuccess: () => {
      toast.success(t("zero.executed"));
      for (const key of ["zero", "tasks", "room", "missions"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const startListening = useCallback(() => {
    if (!SR) return;
    recogRef.current?.abort();
    const recog = new SR();
    recog.lang = "pt-BR";
    recog.continuous = false;
    recog.interimResults = false;
    let heard = false;
    recog.onresult = (ev) => {
      const text = ev.results[ev.resultIndex][0].transcript.trim();
      if (!text) return;
      heard = true;
      if (callRef.current) {
        waitingRef.current = true;
        sendRef.current(text);
      } else {
        setDraft((d) => (d ? `${d} ${text}` : text));
      }
    };
    recog.onerror = () => undefined;
    recog.onend = () => {
      setListening(false);
      // In a call, silence just re-opens the mic; after speaking we wait for Zero.
      if (callRef.current && !heard && !waitingRef.current) {
        window.setTimeout(() => callRef.current && !waitingRef.current && startListening(), 350);
      }
    };
    recogRef.current = recog;
    try {
      recog.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list.length]);

  // New Zero replies: speak them (always in a call), then re-open the mic in a call.
  useEffect(() => {
    if (list.length === 0) return;
    if (!initializedRef.current) {
      for (const m of list) spokenRef.current.add(m.id);
      initializedRef.current = true;
      return;
    }
    const latest = [...list].reverse().find((m) => m.role === "zero");
    if (!latest || spokenRef.current.has(latest.id)) return;
    spokenRef.current.add(latest.id);
    if (callRef.current) {
      waitingRef.current = false;
      speak(latest.content, () => callRef.current && startListening());
    } else if (speakOn) {
      speak(latest.content);
    }
  }, [list, speakOn, startListening]);

  useEffect(
    () => () => {
      callRef.current = false;
      recogRef.current?.abort();
      stopSpeaking();
    },
    []
  );

  const toggleCall = () => {
    if (!SR) {
      toast.error(t("zero.callNoSupport"));
      return;
    }
    const next = !callMode;
    setCallMode(next);
    callRef.current = next;
    waitingRef.current = false;
    if (next) {
      startListening();
    } else {
      recogRef.current?.abort();
      stopSpeaking();
      setListening(false);
    }
  };

  const toggleMic = () => {
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
    } else {
      startListening();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100svh-9.5rem)] max-w-[860px] flex-col p-3 sm:p-6 lg:h-[calc(100svh-3rem)]">
      <header className="flex items-center gap-3 pb-3">
        <AgentAvatar agentKey="zero" size={52} active={thinking || callMode} />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold tracking-tight" data-testid="zero-title">
            {t("zero.title")}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{callMode ? t("zero.callOn") : t("zero.sub")}</p>
        </div>
        <Button
          data-testid="zero-call-toggle"
          variant={callMode ? "destructive" : "default"}
          className="h-11 shrink-0"
          onClick={toggleCall}
        >
          {callMode ? <PhoneOff className="size-4" /> : <Phone className="size-4" />}
          <span className="hidden sm:inline">{callMode ? t("zero.callEnd") : t("zero.call")}</span>
        </Button>
        <button
          data-testid="zero-voice-toggle"
          onClick={() => setSpeakOn((v) => !v)}
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            speakOn ? "border-blue-300 bg-blue-50 text-blue-700" : "border-border bg-white text-slate-400"
          }`}
          aria-label={speakOn ? t("accessibility.voiceOn") : t("accessibility.voiceOff")}
        >
          {speakOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
      </header>

      {wantsCall && (
        <button
          data-testid="zero-answer-call-btn"
          onClick={() => { setParams({}, { replace: true }); toggleCall(); }}
          className="mb-3 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-6 font-heading text-xl font-bold text-white shadow-lg transition-transform duration-150 active:scale-95"
        >
          <Phone className="size-7 animate-pulse" />
          {t("zero.answer")}
        </button>
      )}

      {callMode && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2" data-testid="zero-call-banner">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-blue-600" />
          </span>
          <span className="text-sm font-medium text-blue-800">
            {listening ? `🎙️ ${t("zero.listen")}` : thinking ? t("zero.thinking") : t("zero.callOn")}
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border bg-slate-50/60 p-3" data-testid="zero-chat" aria-live="polite">
        <DataRegionState query={zeroQuery} testId="zero-messages-data" />
        {messages !== undefined && list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground" data-testid="zero-empty">{t("zero.empty")}</p>}
        {list.map((m) => (
          <motion.div
            key={m.id}
            data-testid={`zero-message-${m.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${m.role === "user" ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm border bg-white"}`}>
              {m.role === "zero" && m.intent && (
                <span
                  data-testid={`zero-intent-${m.id}`}
                  className={`mb-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${INTENT_STYLE[m.intent] ?? INTENT_STYLE.explicando}`}
                >
                  {t(`intent.${m.intent}`)}
                </span>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content.replace(/\*\*/g, "")}</p>
              {m.role === "zero" && m.proposal && (
                <div className="mt-2 rounded-lg border bg-slate-50 p-2.5" data-testid={`zero-proposal-${m.id}`}>
                  <p className="text-xs text-slate-700">📋 {m.proposal}</p>
                  {m.mission_id ? (
                    <Link to="/tarefas" data-testid={`zero-mission-link-${m.id}`} className="mt-1.5 inline-block text-xs font-semibold text-blue-600 hover:underline">
                      {t("zero.missionLink")} →
                    </Link>
                  ) : (
                    m.intent === "propondo" && (
                      <Button size="sm" className="mt-2 h-8" data-testid={`zero-execute-${m.id}`} disabled={execute.isPending} onClick={() => execute.mutate(m.id)}>
                        <Play className="size-3.5" />
                        {t("zero.execute")}
                      </Button>
                    )
                  )}
                </div>
              )}
              <p className={`mt-1 font-mono text-[10px] ${m.role === "user" ? "text-blue-200" : "text-muted-foreground"}`}>
                {formatWhen(m.created_at, lang)}
              </p>
            </div>
          </motion.div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground" data-testid="zero-thinking">
            <AgentAvatar agentKey="zero" size={22} />
            <span className="animate-pulse">{t("zero.thinking")}</span>
          </div>
        )}
        {listening && !callMode && (
          <p className="animate-pulse text-center text-xs font-medium text-red-600" data-testid="zero-listening">
            🎙️ {t("zero.listen")}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pt-3">
        {SR && !callMode && (
          <Button
            data-testid="zero-voice-mic-btn"
            variant={listening ? "destructive" : "outline"}
            size="icon-lg"
            className="size-11 shrink-0"
            onClick={toggleMic}
            aria-label={listening ? t("accessibility.micStop") : t("accessibility.micStart")}
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
        )}
        <Input
          data-testid="zero-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("zero.input")}
          className="h-11"
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) send.mutate(draft.trim());
          }}
        />
        <Button data-testid="zero-chat-send-btn" size="lg" className="h-11" disabled={!draft.trim() || send.isPending} onClick={() => draft.trim() && send.mutate(draft.trim())}>
          <Send className="size-4" />
          {t("zero.send")}
        </Button>
      </div>
      <div className="space-y-2 pt-2">
        <ActionErrorNotice
          visible={send.isError}
          pending={send.isPending}
          testId="zero-message-send"
          mayDuplicate
          onDismiss={() => send.reset()}
          onRetry={() => {
            const content = send.variables ?? draft.trim();
            if (content) send.mutate(content);
          }}
        />
        <ActionErrorNotice
          visible={execute.isError}
          pending={execute.isPending}
          testId="zero-proposal-execute"
          onDismiss={() => execute.reset()}
          onRetry={() => execute.variables && execute.mutate(execute.variables)}
        />
      </div>
    </div>
  );
}
