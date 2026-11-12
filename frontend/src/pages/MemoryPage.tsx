import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Plus } from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Memory, Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DataRegionState from "@/components/DataRegionState";

export const MEM_KINDS = ["decisao_chefe", "fato_verificado", "proposta", "antiga"] as const;
export const MEM_STYLE: Record<string, string> = {
  decisao_chefe: "border-blue-200 bg-blue-50 text-blue-800",
  fato_verificado: "border-emerald-200 bg-emerald-50 text-emerald-800",
  proposta: "border-amber-200 bg-amber-50 text-amber-800",
  antiga: "border-slate-300 bg-slate-100 text-slate-600",
};

export default function MemoryPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<string>("decisao_chefe");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [replaces, setReplaces] = useState<Memory | null>(null);
  const [filter, setFilter] = useState("all");

  const memoriesQuery = useQuery({ queryKey: ["memories"], queryFn: () => apiGet<Memory[]>("/memories"), refetchInterval: 6000 });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => apiGet<Project[]>("/projects") });
  const memories = memoriesQuery.data;
  const projects = projectsQuery.data;
  const projectName = (id: string | null) => (projects ?? []).find((p) => p.id === id)?.name;
  const all = memories ?? [];
  const byId = new Map(all.map((m) => [m.id, m]));
  const shown = all.filter((m) => filter === "all" || m.kind === filter);

  const save = useMutation({
    mutationFn: () => apiPost<Memory>("/memories", { kind, title: title.trim(), content: content.trim(), replaces: replaces?.id ?? null, project_id: replaces?.project_id ?? null }),
    onSuccess: () => {
      toast.success(t("memory.saved"));
      setTitle("");
      setContent("");
      setReplaces(null);
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-3 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="memory-title">{t("memory.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("memory.sub")}</p>
      </header>

      <Card>
        <CardContent className="space-y-2 p-4" data-testid="memory-form">
          {replaces && (
            <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800" data-testid="memory-replacing">
              <History className="mr-1 inline size-3.5" />
              {t("memory.replacing")}: {replaces.title}{" "}
              <button className="min-h-11 px-2 underline" data-testid="memory-replacing-cancel" aria-label={t("common.cancel")} onClick={() => setReplaces(null)}>✕</button>
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <Select value={kind} onValueChange={(v: string) => setKind(v)}>
              <SelectTrigger className="h-11 w-full" data-testid="memory-kind-select">
                <SelectValue>{(v) => t(`memory.kind.${v as string}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEM_KINDS.map((k) => <SelectItem key={k} value={k}>{t(`memory.kind.${k}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <label htmlFor="memory-title-field" className="sr-only">{t("memory.what")}</label>
            <Input id="memory-title-field" data-testid="memory-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("memory.what")} className="h-11 min-w-0" />
          </div>
          <label htmlFor="memory-content-field" className="sr-only">{t("memory.why")}</label>
          <Textarea id="memory-content-field" data-testid="memory-content-input" value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("memory.why")} rows={2} />
          <Button className="min-h-11 w-full sm:w-auto" data-testid="memory-save-btn" disabled={title.trim().length < 2 || save.isPending} onClick={() => save.mutate()}>
            <Plus className="size-4" />
            {replaces ? t("memory.saveReplace") : t("memory.save")}
          </Button>
        </CardContent>
      </Card>

      <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0" data-testid="memory-filter-scroll">
        <div className="flex w-max gap-1.5">
          {["all", ...MEM_KINDS].map((k) => (
            <button key={k} data-testid={`memory-filter-${k}`} onClick={() => setFilter(k)}
              className={`min-h-11 shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${filter === k ? "border-blue-600 bg-blue-600 text-white" : "bg-white text-slate-600"}`}>
              {k === "all" ? t("tasks.filterAll") : t(`memory.kind.${k}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <DataRegionState query={memoriesQuery} testId="memories-data" />
        <DataRegionState query={projectsQuery} testId="memory-projects-data" />
        {memories !== undefined && shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground" data-testid="memory-empty">{t("memory.empty")}</p>}
        {shown.map((m) => (
          <Card key={m.id} data-testid={`memory-item-${m.id}`} className={m.superseded_by ? "opacity-60" : ""}>
            <CardContent className="space-y-1.5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${MEM_STYLE[m.kind] ?? MEM_STYLE.antiga}`}>{t(`memory.kind.${m.kind}`)}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{formatWhen(m.created_at, lang)}</span>
                {projectName(m.project_id) && <span className="text-[11px] text-slate-500">📁 {projectName(m.project_id)}</span>}
                {m.superseded_by && <span className="text-[11px] font-semibold text-rose-600">{t("memory.superseded")}</span>}
              </div>
              <p className="font-heading text-sm font-bold">{m.title}</p>
              {m.content && <p className="whitespace-pre-wrap text-sm text-slate-700">{m.content}</p>}
              <p className="text-xs text-slate-500">{t("memory.source")}: {m.source || "—"}</p>
              {m.replaces && byId.get(m.replaces) && <p className="text-xs text-slate-500">↺ {t("memory.replaced")}: {byId.get(m.replaces)?.title}</p>}
              {!m.superseded_by && (
                <button data-testid={`memory-replace-${m.id}`} className="min-h-11 text-xs font-semibold text-blue-600 hover:underline" onClick={() => { setReplaces(m); setKind("decisao_chefe"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  {t("memory.newDecision")}
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
