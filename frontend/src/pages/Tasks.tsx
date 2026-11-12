import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Task } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskCard from "@/components/TaskCard";
import DataRegionState from "@/components/DataRegionState";

const FILTERS = ["all", "review", "working", "queued", "verified", "rejected", "failed"];

export default function Tasks() {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all");

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiGet<Task[]>("/tasks"),
    refetchInterval: 2500,
  });
  const tasks = tasksQuery.data;

  const all = tasks ?? [];
  const shown = all.filter((task) => filter === "all" || task.status === filter);

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-3 sm:p-6">
      <header className="space-y-3">
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="tasks-title">
          {t("tasks.title")}
        </h1>
        <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0" data-testid="tasks-filter-scroll">
          <Tabs value={filter} onValueChange={(v: string) => setFilter(v)}>
            <TabsList data-testid="tasks-filter" className="h-auto w-max min-w-full flex-nowrap justify-start">
              {FILTERS.map((f) => (
                <TabsTrigger key={f} value={f} data-testid={`tasks-filter-${f}`} className="min-h-11 shrink-0">
                  {f === "all" ? t("tasks.filterAll") : t(`status.${f}`)}
                  <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                    {f === "all" ? all.length : all.filter((x) => x.status === f).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="space-y-3">
        <DataRegionState query={tasksQuery} testId="tasks-data" />
        {tasks !== undefined && shown.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground" data-testid="tasks-empty">
            {t("tasks.empty")}
          </p>
        )}
        {shown.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
