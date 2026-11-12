import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Account, Mission, Project, Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/StatusBadge";
import TaskCard from "@/components/TaskCard";
import DataRegionState from "@/components/DataRegionState";

const FIELDS = ["objective", "in_progress", "blocker", "next_step"] as const;
type Field = (typeof FIELDS)[number];
const FIELD_LABEL: Record<Field, string> = {
  objective: "projects.objective",
  in_progress: "projects.inProgress",
  blocker: "projects.blocker",
  next_step: "projects.nextStep",
};
const ACCOUNT_STATUSES = ["available", "busy", "offline", "unverified"];

function ResumeCard({ project }: { project: Project }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<Field, string>>({ objective: "", in_progress: "", blocker: "", next_step: "" });

  const tasksQuery = useQuery({
    queryKey: ["tasks", "project", project.id],
    queryFn: () => apiGet<Task[]>(`/tasks?project_id=${project.id}`),
    refetchInterval: 3000,
  });
  const tasks = tasksQuery.data;

  const resume = useMutation({
    mutationFn: () => apiPost<Mission>(`/projects/${project.id}/resume`),
    onSuccess: () => {
      toast.success(t("projects.resumed"));
      for (const key of ["missions", "tasks", "room"]) queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const save = useMutation({
    mutationFn: (body: Record<string, string>) => apiPatch<Project>(`/projects/${project.id}`, body),
    onSuccess: () => {
      toast.success(t("projects.saved"));
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const startEdit = () => {
    setDraft({ objective: project.objective, in_progress: project.in_progress, blocker: project.blocker, next_step: project.next_step });
    setEditing(true);
  };

  return (
    <div className="space-y-4">
      <Card data-testid="project-resume-card">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-heading text-lg" data-testid="project-name">
              {project.name}
            </CardTitle>
            <StatusBadge status={project.status} testid="project-status" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="project-resume-btn" disabled={resume.isPending} onClick={() => resume.mutate()}>
              <Play className="size-4" />
              {t("projects.resume")}
            </Button>
            {!editing && (
              <Button variant="outline" data-testid="project-edit-btn" onClick={startEdit}>
                {t("projects.edit")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 sm:col-span-2" data-testid="project-last-verified">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{t("projects.lastVerified")}</p>
            <p className="mt-1 text-sm">{project.last_verified.replace(/\*\*/g, "") || t("projects.none")}</p>
            {project.last_verified_at && <p className="mt-1 font-mono text-[11px] text-emerald-700/80">{formatWhen(project.last_verified_at, lang)}</p>}
          </div>
          {FIELDS.map((f) => (
            <div
              key={f}
              data-testid={`project-field-${f}`}
              className={`rounded-lg border p-3 ${f === "blocker" && project.blocker ? "border-amber-300 bg-amber-50/60" : "bg-white"}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t(FIELD_LABEL[f])}</p>
              {editing ? (
                <Textarea
                  data-testid={`project-input-${f}`}
                  value={draft[f]}
                  onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))}
                  rows={2}
                  className="mt-1 text-sm"
                />
              ) : (
                <p className="mt-1 text-sm">{project[f] || t("projects.none")}</p>
              )}
            </div>
          ))}
          {editing && (
            <div className="flex gap-2 sm:col-span-2">
              <Button data-testid="project-save-btn" disabled={save.isPending} onClick={() => save.mutate(draft)}>
                {t("projects.save")}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                ✕
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-base font-bold">{t("projects.tasks")}</h2>
        <DataRegionState query={tasksQuery} testId={`project-${project.id}-tasks-data`} />
        {tasks !== undefined && tasks.length === 0 && <p className="text-sm text-muted-foreground" data-testid={`project-${project.id}-tasks-empty`}>{t("tasks.empty")}</p>}
        {(tasks ?? []).map((task) => (
          <TaskCard key={task.id} task={task} compact />
        ))}
      </div>
    </div>
  );
}

function AccountsCard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: () => apiGet<Account[]>("/accounts") });
  const accounts = accountsQuery.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["accounts"] });

  const add = useMutation({
    mutationFn: () => apiPost<Account>("/accounts", { name: name.trim(), provider: provider.trim() }),
    onSuccess: () => {
      toast.success(t("accounts.added"));
      setName("");
      setProvider("");
      refresh();
    },
    onError: () => toast.error(t("common.error")),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch<Account>(`/accounts/${id}`, { status }),
    onSuccess: refresh,
    onError: () => toast.error(t("common.error")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/accounts/${id}`),
    onSuccess: refresh,
    onError: () => toast.error(t("common.error")),
  });

  return (
    <Card data-testid="accounts-card">
      <CardHeader>
        <CardTitle className="font-heading text-base">{t("accounts.title")}</CardTitle>
        <CardDescription>{t("accounts.sub")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <DataRegionState query={accountsQuery} testId="accounts-data" />
        {accounts !== undefined && accounts.length === 0 && (
          <p className="text-sm text-muted-foreground" data-testid="accounts-empty">{t("data.empty")}</p>
        )}
        {(accounts ?? []).map((a) => (
          <div key={a.id} data-testid={`account-item-${a.id}`} className="flex items-center gap-2 rounded-lg border bg-white p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {a.provider}
                {a.note ? ` · ${a.note}` : ""}
              </p>
            </div>
            <Select value={a.status} onValueChange={(v: string) => setStatus.mutate({ id: a.id, status: v })}>
              <SelectTrigger size="sm" className="w-36" data-testid={`account-status-${a.id}`}>
                <SelectValue>{(v) => t(`accounts.status.${v as string}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`accounts.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon-sm" variant="ghost" data-testid={`account-delete-${a.id}`} onClick={() => remove.mutate(a.id)} aria-label="remove">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Input data-testid="account-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("accounts.name")} className="h-9 flex-1 text-sm" />
          <Input data-testid="account-provider-input" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={t("accounts.provider")} className="h-9 flex-1 text-sm" />
          <Button size="sm" className="h-9" data-testid="account-add-btn" disabled={!name.trim() || !provider.trim() || add.isPending} onClick={() => add.mutate()}>
            {t("accounts.add")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Projects() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<Project[]>("/projects"),
    refetchInterval: 4000,
  });
  const projects = projectsQuery.data;
  const list = projects ?? [];
  const current = list.find((p) => p.id === selected) ?? list[0];

  const create = useMutation({
    mutationFn: () => apiPost<Project>("/projects", { name: newName.trim() }),
    onSuccess: (p) => {
      toast.success(t("projects.created"));
      setNewName("");
      setSelected(p.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-3 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="projects-title">
          {t("projects.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("projects.sub")}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="space-y-3 lg:col-span-4">
          <Card>
            <CardContent className="space-y-2 p-3">
              <DataRegionState query={projectsQuery} testId="projects-data" />
              {projects !== undefined && list.length === 0 && <p className="p-2 text-sm text-muted-foreground" data-testid="projects-empty">{t("projects.empty")}</p>}
              {list.map((p) => (
                <button
                  key={p.id}
                  data-testid={`project-item-${p.id}`}
                  onClick={() => setSelected(p.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    current?.id === p.id ? "border-blue-500 bg-blue-50/60" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.next_step || p.objective}</p>
                  {p.blocker && <p className="mt-1 truncate text-[11px] font-medium text-amber-700">⚠ {p.blocker}</p>}
                </button>
              ))}
              <div className="flex gap-2 border-t pt-3">
                <Input data-testid="project-new-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("projects.name")} className="h-9 text-sm" />
                <Button size="sm" className="h-9" data-testid="project-create-btn" disabled={newName.trim().length < 2 || create.isPending} onClick={() => create.mutate()}>
                  <FolderPlus className="size-4" />
                  {t("projects.create")}
                </Button>
              </div>
            </CardContent>
          </Card>
          <AccountsCard />
        </aside>
        <section className="lg:col-span-8">{current && <ResumeCard key={current.id} project={current} />}</section>
      </div>
    </div>
  );
}
