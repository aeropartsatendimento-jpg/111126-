import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { agentLabel } from "@/lib/agents";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Task } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgentAvatar from "@/components/AgentAvatar";
import StatusBadge from "@/components/StatusBadge";

const FILTERS = ["all", "queued", "working", "done", "failed"];

export default function Tasks() {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState("all");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiGet<Task[]>("/tasks"),
    refetchInterval: 2500,
  });

  const all = tasks ?? [];
  const shown = all.filter((task) => filter === "all" || task.status === filter);

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-3 sm:p-6">
      <header className="space-y-3">
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="tasks-title">
          {t("tasks.title")}
        </h1>
        <Tabs value={filter} onValueChange={(v: string) => setFilter(v)}>
          <TabsList data-testid="tasks-filter" className="flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f} data-testid={`tasks-filter-${f}`}>
                {f === "all" ? t("tasks.filterAll") : t(`status.${f}`)}
                <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                  {f === "all" ? all.length : all.filter((x) => x.status === f).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="space-y-3">
        {shown.length === 0 && !isLoading && (
          <p className="py-12 text-center text-sm text-muted-foreground" data-testid="tasks-empty">
            {t("tasks.empty")}
          </p>
        )}
        {shown.map((task) => (
          <Card key={task.id} data-testid={`task-item-${task.id}`}>
            <CardContent className="space-y-2.5 p-4">
              <div className="flex items-center gap-2.5">
                <AgentAvatar agentKey={task.agent_key} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-bold">
                    {agentLabel(task.agent_key, t)}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">{formatWhen(task.created_at, lang)}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
              <p className="font-heading text-base font-semibold" data-testid={`task-title-${task.id}`}>
                {task.title}
              </p>
              {task.detail && <p className="text-sm text-muted-foreground">{task.detail}</p>}
              {task.mission_text && (
                <p className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                  <span className="font-semibold">{t("tasks.by")}: </span>
                  {task.mission_text}
                </p>
              )}
              {task.result && (
                <div className="rounded-md border bg-slate-50/80 p-2.5" data-testid={`task-result-${task.id}`}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("tasks.result")}</p>
                  <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700">{task.result}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
