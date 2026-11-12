import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { apiGet } from "@/lib/api";
import { AGENT_META, agentLabel } from "@/lib/agents";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Agent, Memory, Project } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { MEM_STYLE } from "@/pages/MemoryPage";
import DataRegionState from "@/components/DataRegionState";

type Sel = { type: "agent"; key: string } | { type: "project"; id: string } | { type: "memory"; id: string } | null;

const W = 1000;
const H = 640;
const C = { x: W / 2, y: H / 2 };
const PRO = { x: C.x, y: C.y - 130 };
const WORKERS: Record<string, { x: number; y: number }> = {
  jarvis: { x: C.x - 230, y: C.y + 70 },
  aluna: { x: C.x, y: C.y + 175 },
  plus: { x: C.x + 230, y: C.y + 70 },
};

const polar = (i: number, n: number, r: number, offset = -Math.PI / 2) => {
  const a = offset + (i / Math.max(n, 1)) * Math.PI * 2;
  return { x: C.x + Math.cos(a) * r * 1.35, y: C.y + Math.sin(a) * r };
};
const pct = (p: { x: number; y: number }) => ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` });

export default function Universe() {
  const { t, lang } = useI18n();
  const [sel, setSel] = useState<Sel>(null);
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: () => apiGet<Agent[]>("/agents"), refetchInterval: 4000 });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => apiGet<Project[]>("/projects"), refetchInterval: 6000 });
  const memoriesQuery = useQuery({ queryKey: ["memories"], queryFn: () => apiGet<Memory[]>("/memories"), refetchInterval: 8000 });
  const agents = agentsQuery.data;
  const projects = projectsQuery.data;
  const memories = memoriesQuery.data;

  const byKey = new Map((agents ?? []).map((a) => [a.key, a]));
  const projs = projects ?? [];
  const mems = (memories ?? []).filter((m) => !m.superseded_by).slice(0, 24);
  const verified = (memories ?? []).filter((m) => m.kind === "fato_verificado" || m.kind === "decisao_chefe").length;
  const zeroSize = Math.min(120, 72 + verified * 4); // Zero grows with validated, recoverable knowledge
  const working = (k: string) => byKey.get(k)?.status === "working";

  const selAgent = sel?.type === "agent" ? byKey.get(sel.key) : undefined;
  const selProject = sel?.type === "project" ? projs.find((p) => p.id === sel.id) : undefined;
  const selMemory = sel?.type === "memory" ? mems.find((m) => m.id === sel.id) : undefined;

  const node = (key: string, p: { x: number; y: number }, size: number) => (
    <button
      key={key}
      data-testid={`universe-agent-${key}`}
      onClick={() => setSel({ type: "agent", key })}
      className="universe-node absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 focus:outline-none"
      style={pct(p)}
    >
      <span
        className={`flex items-center justify-center rounded-full font-heading font-bold text-white ring-white/30 transition-transform duration-200 hover:scale-110 ${sel?.type === "agent" && sel.key === key ? "ring-4" : "ring-1"} ${working(key) ? "universe-pulse" : ""}`}
        style={{ width: size, height: size, background: AGENT_META[key]?.gradient, fontSize: size * 0.36, boxShadow: `0 0 ${size / 2}px rgba(59,130,246,0.45)` }}
      >
        {key === "plus" ? "+" : agentLabel(key, t).charAt(0)}
      </span>
      <span className="text-xs font-semibold text-slate-200">{agentLabel(key, t)}</span>
    </button>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-3 p-3 sm:p-6">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="universe-title">{t("universe.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("universe.sub")}</p>
      </header>
      <div className="grid gap-2 sm:grid-cols-3" data-testid="universe-data-states">
        <div>
          <DataRegionState query={agentsQuery} testId="universe-agents-data" />
          {agents !== undefined && agents.length === 0 && <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground" data-testid="universe-agents-empty">{t("data.empty")}</p>}
        </div>
        <div>
          <DataRegionState query={projectsQuery} testId="universe-projects-data" />
          {projects !== undefined && projects.length === 0 && <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground" data-testid="universe-projects-empty">{t("projects.empty")}</p>}
        </div>
        <div>
          <DataRegionState query={memoriesQuery} testId="universe-memories-data" />
          {memories !== undefined && memories.length === 0 && <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground" data-testid="universe-memories-empty">{t("memory.empty")}</p>}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#070D1F] lg:col-span-9" style={{ aspectRatio: `${W} / ${H}` }} data-testid="universe-canvas">
          <div className="universe-stars absolute inset-0" />
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
            <ellipse cx={C.x} cy={C.y} rx={270 * 1.35} ry={270} fill="none" stroke="rgba(148,163,184,0.12)" strokeDasharray="4 8" />
            <line x1={C.x} y1={C.y} x2={PRO.x} y2={PRO.y} className={working("pro") ? "universe-flow" : ""} stroke="rgba(139,92,246,0.6)" strokeWidth={2} />
            {Object.entries(WORKERS).map(([k, p]) => (
              <line key={k} x1={PRO.x} y1={PRO.y} x2={p.x} y2={p.y} className={working(k) ? "universe-flow" : ""} stroke="rgba(96,165,250,0.45)" strokeWidth={1.5} />
            ))}
          </svg>
          {mems.map((m, i) => {
            const p = polar(i, mems.length, 300, -Math.PI / 3);
            return (
              <button key={m.id} data-testid={`universe-memory-${m.id}`} onClick={() => setSel({ type: "memory", id: m.id })} title={m.title}
                className="universe-twinkle absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200 shadow-[0_0_12px_rgba(186,230,253,0.9)] hover:scale-150"
                style={{ ...pct(p), animationDelay: `${(i % 7) * 0.4}s` }} />
            );
          })}
          {projs.map((pr, i) => {
            const p = polar(i, projs.length, 270, Math.PI / 4);
            return (
              <button key={pr.id} data-testid={`universe-project-${pr.id}`} onClick={() => setSel({ type: "project", id: pr.id })}
                className="absolute flex max-w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center" style={pct(p)}>
                <span className={`flex size-11 items-center justify-center rounded-xl border bg-slate-900/80 text-lg ${pr.blocker ? "universe-alert border-amber-400" : "border-slate-600"}`}>📁</span>
                <span className="line-clamp-2 text-[11px] font-medium text-slate-300">{pr.name}</span>
              </button>
            );
          })}
          {node("zero", C, zeroSize)}
          {node("pro", PRO, 58)}
          {Object.entries(WORKERS).map(([k, p]) => node(k, p, 48))}
        </div>

        <aside className="lg:col-span-3" data-testid="universe-panel">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {!sel && <p className="text-sm text-muted-foreground">{t("universe.pick")}</p>}
            {sel && (
              <button className="float-right text-slate-400 hover:text-slate-700" onClick={() => setSel(null)} data-testid="universe-panel-close" aria-label="close">
                <X className="size-4" />
              </button>
            )}
            {selAgent && (
              <div className="space-y-2" data-testid="universe-agent-detail">
                <p className="font-heading text-lg font-bold">{selAgent.name}</p>
                <p className="text-sm text-slate-600">{lang === "pt" ? selAgent.role_pt : selAgent.role_en}</p>
                <p className="text-xs text-muted-foreground">{lang === "pt" ? selAgent.description_pt : selAgent.description_en}</p>
                <p className="font-mono text-[11px] text-slate-500">{t("hierarchy.brain")}: {selAgent.brain} · {selAgent.open_tasks} {t("hierarchy.openTasks")}</p>
                <Link to={selAgent.key === "zero" ? "/zero" : "/sala"} data-testid="universe-open-chat" className={buttonVariants({ size: "sm" })}>{t("universe.openChat")}</Link>
              </div>
            )}
            {selProject && (
              <div className="space-y-2" data-testid="universe-project-detail">
                <p className="font-heading text-lg font-bold">{selProject.name}</p>
                <p className="text-sm"><b>{t("projects.objective")}:</b> {selProject.objective || "—"}</p>
                <p className="text-sm"><b>{t("projects.nextStep")}:</b> {selProject.next_step || "—"}</p>
                {selProject.blocker && <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">⚠ {selProject.blocker}</p>}
                <Link to="/projetos" data-testid="universe-open-project" className={buttonVariants({ size: "sm" })}>{t("universe.openProject")}</Link>
              </div>
            )}
            {selMemory && (
              <div className="space-y-2" data-testid="universe-memory-detail">
                <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${MEM_STYLE[selMemory.kind]}`}>{t(`memory.kind.${selMemory.kind}`)}</span>
                <p className="font-heading text-base font-bold">{selMemory.title}</p>
                <p className="line-clamp-6 text-sm text-slate-700">{selMemory.content}</p>
                <p className="text-xs text-slate-500">{formatWhen(selMemory.created_at, lang)} · {t("memory.source")}: {selMemory.source}</p>
                <Link to="/memoria" data-testid="universe-open-memory" className={buttonVariants({ size: "sm", variant: "outline" })}>{t("universe.openMemory")}</Link>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("universe.legend")}</p>
        </aside>
      </div>
    </div>
  );
}
