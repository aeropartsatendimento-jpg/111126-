import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Copy, Eye, ExternalLink, Keyboard, Monitor, MousePointerClick, Play, ShieldCheck, TriangleAlert, ClipboardPaste } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { apiGet, apiPost } from "@/lib/api";
import { formatWhen } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { VisualMission } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DataRegionState from "@/components/DataRegionState";
import ActionErrorNotice from "@/components/ActionErrorNotice";

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function statusTone(status: string): string {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

const ACTION_TYPES = ["open", "read", "click", "write", "copy", "paste"] as const;

function ActionIcon({ type }: { type: string }) {
  if (type === "open") return <ExternalLink className="size-4" />;
  if (type === "read") return <Eye className="size-4" />;
  if (type === "click") return <MousePointerClick className="size-4" />;
  if (type === "write") return <Keyboard className="size-4" />;
  if (type === "copy") return <Copy className="size-4" />;
  return <ClipboardPaste className="size-4" />;
}

export default function VisualBrowser() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [objective, setObjective] = useState("");
  const [actionTypes, setActionTypes] = useState<string[]>([...ACTION_TYPES]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const missionsQuery = useQuery({
    queryKey: ["visual-missions"],
    queryFn: () => apiGet<VisualMission[]>("/visual/missions"),
    refetchInterval: 1200,
  });
  const missions = missionsQuery.data;
  const list = missions ?? [];
  const current = list.find((mission) => mission.id === selectedId) ?? list[0];

  const create = useMutation({
    mutationFn: () => apiPost<VisualMission>("/visual/missions", { url: url.trim(), objective: objective.trim(), action_types: actionTypes }),
    onSuccess: (mission) => {
      setSelectedId(mission.id);
      setObjective("");
      queryClient.invalidateQueries({ queryKey: ["visual-missions"] });
      toast.success(t("visual.created"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const toggleAction = (actionType: string) => {
    setActionTypes((currentTypes) =>
      currentTypes.includes(actionType)
        ? currentTypes.filter((item) => item !== actionType)
        : ACTION_TYPES.filter((item) => [...currentTypes, actionType].includes(item))
    );
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-3 sm:p-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="visual-browser-title">
            {t("visual.title")}
          </h1>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800" data-testid="visual-mode-badge">
            {t("visual.mode")}
          </Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground" data-testid="visual-browser-subtitle">
          {t("visual.sub")}
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4" data-testid="visual-simulation-warning">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-bold text-amber-900" data-testid="visual-warning-title">{t("visual.warningTitle")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800" data-testid="visual-warning-copy">{t("visual.warningCopy")}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <aside className="space-y-5 lg:col-span-4">
          <Card data-testid="visual-mission-form-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="visual-form-title">{t("visual.newMission")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="visual-url" className="text-xs font-semibold" data-testid="visual-url-label">{t("visual.url")}</label>
                <Input
                  id="visual-url"
                  data-testid="visual-url-input"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={t("visual.urlPlaceholder")}
                  inputMode="url"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="visual-objective" className="text-xs font-semibold" data-testid="visual-objective-label">{t("visual.objective")}</label>
                <Textarea
                  id="visual-objective"
                  data-testid="visual-objective-input"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  placeholder={t("visual.objectivePlaceholder")}
                  rows={4}
                />
              </div>
              <div className="space-y-2" data-testid="visual-action-selector">
                <div>
                  <p className="text-xs font-semibold" data-testid="visual-actions-label">{t("visual.actions")}</p>
                  <p className="text-[11px] text-muted-foreground" data-testid="visual-actions-help">{t("visual.actionsHelp")}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                  {ACTION_TYPES.map((actionType) => (
                    <label
                      key={actionType}
                      data-testid={`visual-action-option-${actionType}`}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-xs font-medium hover:bg-slate-50"
                    >
                      <Checkbox
                        data-testid={`visual-action-toggle-${actionType}`}
                        checked={actionTypes.includes(actionType)}
                        onCheckedChange={() => toggleAction(actionType)}
                      />
                      <ActionIcon type={actionType} />
                      {t(`visual.action.${actionType}`)}
                    </label>
                  ))}
                </div>
                {actionTypes.length === 0 && (
                  <p className="text-xs text-red-600" data-testid="visual-actions-required">{t("visual.actionsRequired")}</p>
                )}
              </div>
              <Button
                className="w-full"
                size="lg"
                data-testid="visual-run-button"
                disabled={!validUrl(url.trim()) || objective.trim().length < 3 || actionTypes.length === 0 || create.isPending}
                onClick={() => create.mutate()}
              >
                <Play className="size-4" />
                {create.isPending ? t("visual.starting") : t("visual.run")}
              </Button>
              <ActionErrorNotice
                visible={create.isError}
                pending={create.isPending}
                testId="visual-mission-create"
                mayDuplicate
                onDismiss={() => create.reset()}
                onRetry={() => create.mutate()}
              />
            </CardContent>
          </Card>

          <Card data-testid="visual-history-card">
            <CardHeader>
              <CardTitle className="font-heading text-base" data-testid="visual-history-title">{t("visual.history")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DataRegionState query={missionsQuery} testId="visual-history-data" />
              {missions !== undefined && list.length === 0 && (
                <p className="text-sm text-muted-foreground" data-testid="visual-history-empty">{t("visual.empty")}</p>
              )}
              {list.map((mission) => (
                <button
                  key={mission.id}
                  data-testid={`visual-history-item-${mission.id}`}
                  onClick={() => setSelectedId(mission.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors duration-150 ${
                    current?.id === mission.id ? "border-blue-500 bg-blue-50" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold" data-testid={`visual-history-host-${mission.id}`}>
                      {new URL(mission.url).host}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(mission.status)}`} data-testid={`visual-history-status-${mission.id}`}>
                      {t(`visual.status.${mission.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" data-testid={`visual-history-objective-${mission.id}`}>{mission.objective}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400" data-testid={`visual-history-time-${mission.id}`}>{formatWhen(mission.created_at, lang)}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="lg:col-span-8" data-testid="visual-browser-stage">
          <div className="overflow-hidden rounded-2xl border bg-white shadow-xl shadow-slate-200/60">
            <div className="flex items-center gap-2 border-b bg-slate-100 px-4 py-3" data-testid="visual-browser-toolbar">
              <span className="size-3 rounded-full bg-red-400" />
              <span className="size-3 rounded-full bg-amber-400" />
              <span className="size-3 rounded-full bg-emerald-400" />
              <div className="ml-2 min-w-0 flex-1 rounded-md border bg-white px-3 py-1.5 font-mono text-xs text-slate-500" data-testid="visual-browser-address">
                {current?.url ?? t("visual.noTarget")}
              </div>
              <ShieldCheck className="size-4 text-emerald-600" />
            </div>

            <div className="min-h-[560px] bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_40%)] p-5 sm:p-8">
              {!current ? (
                <div className="flex min-h-[480px] flex-col items-center justify-center text-center" data-testid="visual-stage-empty">
                  <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Monitor className="size-8" />
                  </span>
                  <h2 className="font-heading text-xl font-bold" data-testid="visual-stage-empty-title">{t("visual.stageEmptyTitle")}</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground" data-testid="visual-stage-empty-copy">{t("visual.stageEmptyCopy")}</p>
                </div>
              ) : (
                <div className="space-y-6" data-testid={`visual-mission-detail-${current.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600" data-testid="visual-detail-kicker">{t("visual.preview")}</p>
                      <h2 className="mt-1 font-heading text-2xl font-bold" data-testid="visual-detail-objective">{current.objective}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(current.status)}`} data-testid="visual-detail-status">
                      {t(`visual.status.${current.status}`)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4" data-testid="visual-no-access-note">
                    <p className="text-xs font-bold text-slate-700" data-testid="visual-no-access-title">{t("visual.noAccessTitle")}</p>
                    <p className="mt-1 text-xs text-slate-500" data-testid="visual-no-access-copy">{t("visual.noAccessCopy")}</p>
                  </div>

                  <div className="space-y-3" data-testid="visual-steps-list">
                    {current.steps.map((step, index) => {
                      const complete = step.status === "completed";
                      return (
                        <motion.div
                          key={step.key}
                          data-testid={`visual-step-${step.key}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex gap-3 rounded-xl border bg-white p-4"
                        >
                          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                            {complete ? <Check className="size-4" /> : <Clock3 className="size-4 animate-pulse" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold" data-testid={`visual-step-label-${step.key}`}>{step.label}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground" data-testid={`visual-step-detail-${step.key}`}>
                              {step.detail || t("visual.waiting")}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="space-y-3" data-testid="visual-actions-section">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500" data-testid="visual-actions-title">{t("visual.actionPlan")}</p>
                      <p className="mt-1 text-xs text-muted-foreground" data-testid="visual-actions-disclaimer">{t("visual.actionDisclaimer")}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2" data-testid="visual-actions-list">
                      {current.actions.map((action) => {
                        const complete = action.status === "completed";
                        return (
                          <motion.article
                            key={action.type}
                            data-testid={`visual-action-${action.type}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border bg-white p-4"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`flex size-8 items-center justify-center rounded-lg ${complete ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                <ActionIcon type={action.type} />
                              </span>
                              <p className="font-heading text-sm font-bold" data-testid={`visual-action-label-${action.type}`}>{t(`visual.action.${action.type}`)}</p>
                              <span className={`ml-auto size-2 rounded-full ${complete ? "bg-emerald-500" : "animate-pulse bg-blue-500"}`} />
                            </div>
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400" data-testid={`visual-action-target-label-${action.type}`}>{t("visual.actionTarget")}</p>
                            <p className="mt-0.5 break-words text-xs text-slate-600" data-testid={`visual-action-target-${action.type}`}>{action.target}</p>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground" data-testid={`visual-action-output-${action.type}`}>{action.output || t("visual.waiting")}</p>
                          </motion.article>
                        );
                      })}
                    </div>
                  </div>

                  {current.result && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4" data-testid="visual-result">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700" data-testid="visual-result-title">{t("visual.result")}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-blue-950" data-testid="visual-result-copy">{current.result}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}