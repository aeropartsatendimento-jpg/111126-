import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Send, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { WORKER_ORDER } from "@/lib/agents";
import { useI18n } from "@/lib/i18n";
import { speak } from "@/lib/speech";
import type { Agent, Briefing, BriefingSettings, Channel, Mission, Project, StoreItem, Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import AgentAvatar from "@/components/AgentAvatar";
import StatusBadge from "@/components/StatusBadge";
import RoomStream from "@/components/RoomStream";

const CHIPS = ["chip.weather", "chip.store", "chip.emails", "chip.cameras"];

function AgentNode({ agentKey, agent }: { agentKey: string; agent?: Agent }) {
  const { t, lang } = useI18n();
  const name = agent?.name ?? agentKey.charAt(0).toUpperCase() + agentKey.slice(1);
  const role = agent ? (lang === "pt" ? agent.role_pt : agent.role_en) : "";
  return (
    <div data-testid={`agent-card-${agentKey}`} className="rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <AgentAvatar agentKey={agentKey} active={agent?.status === "working"} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-heading text-sm font-bold">{name}</span>
            {agent?.status === "working" && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {t("status.working")}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
        {agent && agent.open_tasks > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700" data-testid={`agent-open-tasks-${agentKey}`}>
            {agent.open_tasks} {t("hierarchy.openTasks")}
          </span>
        )}
      </div>
      {agent && (
        <p className="mt-2 border-t pt-2 font-mono text-[11px] text-slate-500" data-testid={`agent-brain-${agentKey}`}>
          {t("hierarchy.brain")}: {agent.brain}
        </p>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center py-0.5">
      <div className="h-3 w-px bg-border" />
      <div className="size-1.5 rounded-full bg-blue-400/70" />
      <div className="h-3 w-px bg-border" />
    </div>
  );
}

function HierarchyPanel() {
  const { t } = useI18n();
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiGet<Agent[]>("/agents"),
    refetchInterval: 3000,
  });
  const byKey = new Map((agents ?? []).map((a) => [a.key, a]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">{t("hierarchy.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3" data-testid="agent-card-boss">
          <div className="flex items-center gap-2.5">
            <AgentAvatar agentKey="user" size={38} />
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-bold">{t("hierarchy.boss")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("hierarchy.bossSub")}</p>
            </div>
          </div>
        </div>
        <Connector />
        <AgentNode agentKey="zero" agent={byKey.get("zero")} />
        <Connector />
        <AgentNode agentKey="pro" agent={byKey.get("pro")} />
        <Connector />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1">
          {WORKER_ORDER.map((key) => (
            <AgentNode key={key} agentKey={key} agent={byKey.get(key)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MissionPanel() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [projectId, setProjectId] = useState("none");
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => apiGet<Project[]>("/projects") });
  const projectName = (id: string) => (id === "none" ? t("projects.pick") : (projects ?? []).find((p) => p.id === id)?.name ?? id);

  const dispatch = useMutation({
    mutationFn: (text: string) => apiPost<Mission>("/missions", { text, project_id: projectId === "none" ? null : projectId }),
    onSuccess: () => {
      setDraft("");
      toast.success(t("mission.sent"));
      for (const key of ["missions", "tasks", "room", "agents"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: () => toast.error(t("mission.error")),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">{t("mission.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          data-testid="mission-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("mission.placeholder")}
          rows={3}
        />
        <Select value={projectId} onValueChange={(v: string) => setProjectId(v)}>
          <SelectTrigger className="w-full" data-testid="mission-project-select">
            <SelectValue>{(v) => `📁 ${projectName(v as string)}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("projects.pick")}</SelectItem>
            {(projects ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip, i) => (
            <button
              key={chip}
              data-testid={`mission-chip-${i}`}
              onClick={() => setDraft(t(chip))}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
            >
              {t(chip)}
            </button>
          ))}
        </div>
        <Button
          data-testid="dispatch-mission-btn"
          className="w-full"
          size="lg"
          disabled={!draft.trim() || draft.trim().length < 3 || dispatch.isPending}
          onClick={() => draft.trim() && dispatch.mutate(draft.trim())}
        >
          <Send className="size-4" />
          {dispatch.isPending ? t("mission.sending") : t("mission.send")}
        </Button>
      </CardContent>
    </Card>
  );
}

const BRIEFING_HOURS = [5, 6, 7, 8, 9, 10];

function BriefingCard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [cityDraft, setCityDraft] = useState("");

  const { data: briefings } = useQuery({
    queryKey: ["briefings"],
    queryFn: () => apiGet<Briefing[]>("/briefing"),
    refetchInterval: 10000,
  });
  const { data: settings } = useQuery({
    queryKey: ["briefing-settings"],
    queryFn: () => apiGet<BriefingSettings>("/briefing/settings"),
  });

  useEffect(() => {
    if (settings?.city) setCityDraft(settings.city);
  }, [settings?.city]);

  const run = useMutation({
    mutationFn: () => apiPost<Briefing>("/briefing/run"),
    onSuccess: () => {
      toast.success(t("briefing.done"));
      queryClient.invalidateQueries({ queryKey: ["briefings"] });
      queryClient.invalidateQueries({ queryKey: ["room"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPatch<BriefingSettings>("/briefing/settings", body),
    onSuccess: () => {
      toast.success(t("briefing.saved"));
      queryClient.invalidateQueries({ queryKey: ["briefing-settings"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const latest = briefings?.[0];

  return (
    <Card data-testid="briefing-card">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base">{t("briefing.title")}</CardTitle>
        <div className="flex gap-1.5">
          {latest && (
            <Button size="sm" variant="outline" data-testid="briefing-listen-btn" onClick={() => speak(latest.content)}>
              <Volume2 className="size-4" />
              {t("briefing.listen")}
            </Button>
          )}
          <Button size="sm" data-testid="briefing-run-btn" disabled={run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? t("briefing.running") : t("briefing.run")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium">
            <Checkbox
              data-testid="briefing-auto-toggle"
              checked={settings?.auto ?? true}
              onCheckedChange={(c) => save.mutate({ auto: Boolean(c) })}
            />
            {t("briefing.auto")}
          </label>
          <Select value={String(settings?.hour ?? 7)} onValueChange={(v: string) => save.mutate({ hour: Number(v) })}>
            <SelectTrigger size="sm" className="w-20" data-testid="briefing-hour-select">
              <SelectValue>{(v) => `${v as string}h`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BRIEFING_HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {`${h}h`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            data-testid="briefing-city-input"
            value={cityDraft}
            onChange={(e) => setCityDraft(e.target.value)}
            onBlur={() => {
              if (cityDraft.trim() && cityDraft.trim() !== settings?.city) save.mutate({ city: cityDraft.trim() });
            }}
            placeholder={t("briefing.city")}
            className="h-9 w-36 text-xs"
          />
        </div>
        {latest ? (
          <div className="rounded-lg border bg-sky-50/50 p-3" data-testid="briefing-latest">
            <p className="mb-1 font-mono text-[11px] text-slate-500">
              {latest.day} · {latest.city}
            </p>
            <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed">{latest.content.replace(/\*\*/g, "")}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="briefing-empty">
            {t("briefing.empty")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatsRow() {
  const { t } = useI18n();
  const { data: missions } = useQuery({ queryKey: ["missions"], queryFn: () => apiGet<Mission[]>("/missions"), refetchInterval: 3000 });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => apiGet<Task[]>("/tasks"), refetchInterval: 3000 });

  const active = (missions ?? []).filter((m) => m.status === "planning" || m.status === "delegating").length;
  const queued = (tasks ?? []).filter((x) => x.status === "queued" || x.status === "working").length;
  const done = (tasks ?? []).filter((x) => x.status === "verified").length;
  const review = (tasks ?? []).filter((x) => x.status === "review").length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="stats-row">
      {[
        { label: t("stats.active"), value: active, tid: "stat-active" },
        { label: t("stats.queued"), value: queued, tid: "stat-queued" },
        { label: t("status.review"), value: review, tid: "stat-review" },
        { label: t("status.verified"), value: done, tid: "stat-done" },
      ].map(({ label, value, tid }) => (
        <div key={tid} className="rounded-lg border bg-white p-3 text-center shadow-sm">
          <p className="font-heading text-2xl font-bold text-blue-600" data-testid={tid}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

function TasksPreview() {
  const { t } = useI18n();
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => apiGet<Task[]>("/tasks"), refetchInterval: 3000 });
  const shown = (tasks ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base">{t("tasks.preview")}</CardTitle>
        <Link to="/tarefas" data-testid="tasks-preview-link" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          {t("tasks.openFull")}
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {shown.length === 0 && <p className="py-2 text-sm text-muted-foreground">{t("tasks.empty")}</p>}
        {shown.map((task) => (
          <div key={task.id} data-testid={`task-preview-${task.id}`} className="flex items-center gap-2.5 rounded-lg border bg-white p-2.5">
            <AgentAvatar agentKey={task.agent_key} size={28} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
            <StatusBadge status={task.status} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StoreCard() {
  const { t } = useI18n();
  const { data: items } = useQuery({ queryKey: ["store"], queryFn: () => apiGet<StoreItem[]>("/store/items"), refetchInterval: 5000 });
  const all = items ?? [];
  const groups = [
    { key: "stock", status: "critical", label: "store.stock", dot: "bg-red-500" },
    { key: "order", status: "open", label: "store.order", dot: "bg-blue-500" },
    { key: "coupon", status: "active", label: "store.coupon", dot: "bg-emerald-500" },
  ];
  return (
    <Card data-testid="store-card">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base">{t("store.title")}</CardTitle>
        <Link to="/loja" data-testid="store-preview-link" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          {t("store.openFull")}
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((g) => {
          const hot = all.filter((i) => i.kind === g.key && i.status === g.status);
          return (
            <div key={g.key} data-testid={`store-group-${g.key}`}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span className={`size-2 rounded-full ${g.dot}`} />
                {t(g.label)} · {t(`store.${g.status}`)} <span className="font-mono">({hot.length})</span>
              </p>
              {hot.slice(0, 3).map((i) => (
                <p key={i.id} className="truncate pl-3.5 text-sm">
                  {i.title} <span className="font-mono text-xs text-muted-foreground">{i.value}</span>
                </p>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ChannelsPreview() {
  const { t, lang } = useI18n();
  const { data: channels } = useQuery({ queryKey: ["channels"], queryFn: () => apiGet<Channel[]>("/channels"), refetchInterval: 5000 });
  const shown = (channels ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base">{t("channels.preview")}</CardTitle>
        <Link to="/canais" data-testid="channels-preview-link" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          {t("channels.openFull")}
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {shown.map((ch) => (
          <div key={ch.id} data-testid={`channel-preview-${ch.key}`} className="flex items-center gap-2.5">
            <span className={`size-2 shrink-0 rounded-full ${ch.status === "connected" ? "bg-emerald-500" : "bg-slate-300"}`} />
            <span className="min-w-0 flex-1 truncate text-sm">{ch.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {ch.status === "connected" ? t("channels.connected") : t("channels.disconnected")}
            </span>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-muted-foreground">{lang === "pt" ? "Conexões do Zero com o mundo" : "Zero's connections to the world"}</p>
      </CardContent>
    </Card>
  );
}

export default function Cockpit() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-3 sm:space-y-5 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl" data-testid="cockpit-title">
          {t("cockpit.greeting")}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("cockpit.sub")}</p>
      </header>

      <StatsRow />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="space-y-4 sm:space-y-5 lg:col-span-3">
          <HierarchyPanel />
        </div>
        <div className="space-y-4 sm:space-y-5 lg:col-span-5">
          <MissionPanel />
          <Card className="flex min-h-[320px] flex-col">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="font-heading text-base">{t("room.title")}</CardTitle>
              <Link to="/sala" data-testid="room-preview-link" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                {t("room.openFull")}
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
              <RoomStream limit={8} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 sm:space-y-5 lg:col-span-4">
          <BriefingCard />
          <StoreCard />
          <TasksPreview />
          <ChannelsPreview />
        </div>
      </div>
    </div>
  );
}
