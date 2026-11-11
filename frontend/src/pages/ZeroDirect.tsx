import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { DirectMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AgentAvatar from "@/components/AgentAvatar";

export default function ZeroDirect() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: messages } = useQuery({
    queryKey: ["zero"],
    queryFn: () => apiGet<DirectMessage[]>("/zero/messages"),
    refetchInterval: 2000,
  });
  const list = messages ?? [];
  const thinking = list.length > 0 && list[list.length - 1].role === "user";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list.length]);

  const send = useMutation({
    mutationFn: (content: string) => apiPost<DirectMessage>("/zero/chat", { content }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["zero"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="mx-auto flex h-[calc(100svh-9.5rem)] max-w-[860px] flex-col p-3 sm:p-6 lg:h-[calc(100svh-3rem)]">
      <header className="flex items-center gap-3 pb-3">
        <AgentAvatar agentKey="zero" size={52} active={thinking} />
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold tracking-tight" data-testid="zero-title">
            {t("zero.title")}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{t("zero.sub")}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border bg-slate-50/60 p-3" data-testid="zero-chat" aria-live="polite">
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground" data-testid="zero-empty">{t("zero.empty")}</p>}
        {list.map((m) => (
          <motion.div
            key={m.id}
            data-testid={`zero-message-${m.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm ${m.role === "user" ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm border bg-white"}`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
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
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pt-3">
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
    </div>
  );
}
