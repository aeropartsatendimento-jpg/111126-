import { useI18n } from "@/lib/i18n";

const STYLES: Record<string, { cls: string; dot: string; labelKey: string }> = {
  queued: { cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", labelKey: "status.queued" },
  working: { cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", labelKey: "status.working" },
  done: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", labelKey: "status.done" },
  failed: { cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", labelKey: "status.failed" },
  planning: { cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", labelKey: "mission.status.planning" },
  delegating: { cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", labelKey: "mission.status.delegating" },
  completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", labelKey: "mission.status.completed" },
  disconnected: { cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400", labelKey: "channels.disconnected" },
  connected: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", labelKey: "channels.connected" },
};

export default function StatusBadge({ status, testid }: { status: string; testid?: string }) {
  const { t } = useI18n();
  const style = STYLES[status] ?? STYLES.queued;
  return (
    <span
      data-testid={testid ?? `status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 ${style.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${status === "working" ? "animate-pulse" : ""}`} />
      {t(style.labelKey)}
    </span>
  );
}
