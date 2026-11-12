import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { apiPatch } from "@/lib/api";
import { agentLabel } from "@/lib/agents";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AgentAvatar from "@/components/AgentAvatar";
import StatusBadge from "@/components/StatusBadge";
import ActionErrorNotice from "@/components/ActionErrorNotice";

// One delivery: who did it, the result, and — while it awaits review — the Chefe's verdict.
export default function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const review = useMutation({
    mutationFn: (approve: boolean) => apiPatch<Task>(`/tasks/${task.id}/review`, { approve, note: note.trim() || null }),
    onSuccess: (_d, approve) => {
      toast.success(approve ? t("review.approved") : t("review.rejected"));
      setNote("");
      for (const key of ["tasks", "projects", "room"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <Card data-testid={`task-item-${task.id}`}>
      <CardContent className="space-y-2.5 p-4">
        <div className="flex items-center gap-2.5">
          <AgentAvatar agentKey={task.agent_key} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold">{agentLabel(task.agent_key, t)}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{formatWhen(task.created_at, lang)}</p>
          </div>
          <StatusBadge status={task.status} testid={`task-status-${task.id}`} />
        </div>
        <p className="font-heading text-base font-semibold" data-testid={`task-title-${task.id}`}>
          {task.title}
        </p>
        {!compact && task.detail && <p className="text-sm text-muted-foreground">{task.detail}</p>}
        {!compact && task.mission_text && (
          <p className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
            <span className="font-semibold">{t("tasks.by")}: </span>
            {task.mission_text}
          </p>
        )}
        {task.result && (
          <div className="rounded-md border bg-slate-50/80 p-2.5" data-testid={`task-result-${task.id}`}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("tasks.result")}</p>
            <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700">{task.result.replace(/\*\*/g, "")}</p>
          </div>
        )}
        {task.review_note && <p className="text-xs italic text-slate-500">“{task.review_note}”</p>}
        {task.status === "review" && (
          <div className="space-y-2 border-t pt-2.5">
            <ActionErrorNotice
              visible={review.isError}
              pending={review.isPending}
              testId={`task-${task.id}-review`}
              onDismiss={() => review.reset()}
              onRetry={() => typeof review.variables === "boolean" && review.mutate(review.variables)}
            />
            <div className="flex flex-wrap items-center gap-2">
            <Input
              data-testid={`task-review-note-${task.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              className="h-11 min-w-40 flex-1 text-xs"
            />
            <Button size="sm" className="h-11" data-testid={`task-approve-${task.id}`} disabled={review.isPending} onClick={() => review.mutate(true)}>
              <Check className="size-4" />
              {t("review.approve")}
            </Button>
            <Button size="sm" variant="outline" className="h-11" data-testid={`task-reject-${task.id}`} disabled={review.isPending} onClick={() => review.mutate(false)}>
              <Undo2 className="size-4" />
              {t("review.reject")}
            </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
