import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import { agentLabel } from "@/lib/agents";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { RoomMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AgentAvatar from "@/components/AgentAvatar";
import DataRegionState from "@/components/DataRegionState";

const FILTERS = ["all", "zero", "pro", "jarvis", "aluna", "plus", "user", "system"];

interface Props {
  limit?: number;
  full?: boolean;
}

export default function RoomStream({ limit = 200, full = false }: Props) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const roomQuery = useQuery({
    queryKey: ["room"],
    queryFn: () => apiGet<RoomMessage[]>("/room/messages"),
    refetchInterval: 2500,
  });
  const messages = roomQuery.data;

  const post = useMutation({
    mutationFn: (content: string) => apiPost<RoomMessage>("/room/messages", { content }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["room"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const all = messages ?? [];
  const filtered = filter === "all" ? all : all.filter((m) => m.sender_key === filter);
  const shown = full ? filtered : filtered.slice(-limit);
  const thinking = all.length > 0 && all[all.length - 1].sender_key === "user";

  useEffect(() => {
    if (full && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [all.length, full]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="room-stream">
      {full && (
        <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0" data-testid="room-filter-scroll">
          <div className="flex w-max gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                data-testid={`room-filter-${f}`}
                onClick={() => setFilter(f)}
                className={`min-h-11 shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-border bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f === "all" ? t("room.filterAll") : agentLabel(f, t)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        aria-live="polite"
        className={`min-h-0 space-y-3 overflow-y-auto pr-1 ${full ? "flex-1" : ""}`}
      >
        <DataRegionState query={roomQuery} testId={full ? "room-page-data" : "cockpit-room-data"} />
        {messages !== undefined && shown.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground" data-testid={full ? "room-page-empty" : "cockpit-room-empty"}>
            {t("room.empty")}
          </p>
        )}
        {shown.map((m) => {
          const style =
            m.kind === "delegation"
              ? "border-l-4 border-blue-500 bg-blue-50/50"
              : m.kind === "summary"
                ? "border-l-4 border-emerald-500 bg-emerald-50/50"
                : m.kind === "briefing"
                  ? "border-l-4 border-sky-500 bg-sky-50/60"
                  : m.kind === "system"
                    ? "border border-dashed border-border bg-slate-50/60"
                    : "border border-border bg-white";
          return (
            <motion.article
              key={m.id}
              data-testid={`room-message-${m.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`rounded-lg p-3 shadow-sm ${style}`}
            >
              <header className="mb-1 flex items-center gap-2">
                <AgentAvatar agentKey={m.sender_key} size={26} />
                <span className="text-sm font-semibold">{agentLabel(m.sender_key, t)}</span>
                {m.kind === "delegation" && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t("kind.delegation")}
                  </span>
                )}
                {m.kind === "summary" && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t("kind.summary")}
                  </span>
                )}
                {m.kind === "briefing" && (
                  <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t("kind.briefing")}
                  </span>
                )}
                {m.kind === "system" && (
                  <span className="rounded-full border border-dashed border-slate-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t("kind.system")}
                  </span>
                )}
                <time className="ml-auto font-mono text-[11px] text-muted-foreground" data-testid={`room-time-${m.id}`}>
                  {formatWhen(m.created_at, lang)}
                </time>
              </header>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {m.content.replace(/\*\*/g, "")}
              </p>
            </motion.article>
          );
        })}
        {thinking && (
          <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground" data-testid="room-thinking">
            <AgentAvatar agentKey="zero" size={22} />
            <span className="animate-pulse">{t("room.thinking")}</span>
          </div>
        )}
      </div>

      {full && (
        <div className="grid grid-cols-1 items-end gap-2 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Textarea
            data-testid="room-message-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("room.input")}
            rows={1}
            className="min-h-11 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) post.mutate(draft.trim());
              }
            }}
          />
          <Button
            data-testid="room-send-btn"
            size="lg"
            className="h-11 w-full sm:w-auto"
            disabled={!draft.trim() || post.isPending}
            onClick={() => draft.trim() && post.mutate(draft.trim())}
          >
            <Send className="size-4" />
            {t("room.send")}
          </Button>
        </div>
      )}
    </div>
  );
}
