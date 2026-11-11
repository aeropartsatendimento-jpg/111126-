import { useEffect, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { MotionConfig } from "motion/react";
import { FolderKanban, Globe, Languages, LayoutDashboard, ListChecks, MessagesSquare, Moon, PhoneCall, Store, Sun } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

import { apiGet } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { speak, TTS_SUPPORTED } from "@/lib/speech";
import type { Briefing, SystemInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "nav.cockpit", icon: LayoutDashboard, tid: "nav-cockpit", end: true },
  { to: "/sala", key: "nav.room", icon: MessagesSquare, tid: "nav-room", end: false },
  { to: "/projetos", key: "nav.projects", icon: FolderKanban, tid: "nav-projects", end: false },
  { to: "/tarefas", key: "nav.tasks", icon: ListChecks, tid: "nav-tasks", end: false },
  { to: "/zero", key: "nav.zero", icon: PhoneCall, tid: "nav-zero", end: false },
  { to: "/loja", key: "nav.store", icon: Store, tid: "nav-store", end: false },
  { to: "/canais", key: "nav.channels", icon: Globe, tid: "nav-channels", end: false },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg font-heading text-lg font-bold text-white"
        style={{ background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)" }}
        data-testid="brand-mark"
      >
        Z
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block font-heading text-sm font-bold leading-tight text-white">{t("brand.title")}</span>
          <span className="block truncate text-[11px] leading-tight text-slate-400">{t("brand.sub")}</span>
        </span>
      )}
    </div>
  );
}

function Toggles() {
  const { t } = useI18n();
  const { lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <button
        data-testid="lang-toggle-btn"
        onClick={() => setLang(lang === "pt" ? "en" : "pt")}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 font-mono text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800"
        aria-label={t("lang.toggle")}
      >
        <Languages className="size-4" />
        {lang.toUpperCase()}
      </button>
      <button
        data-testid="theme-toggle-btn"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="inline-flex size-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 transition-colors hover:bg-slate-800"
        aria-label={t("theme.toggle")}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </button>
    </div>
  );
}

function BrainPill() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["system"],
    queryFn: () => apiGet<SystemInfo>("/system"),
    refetchInterval: 15000,
    retry: false,
  });
  const live = data?.brain === "cloud";
  return (
    <div
      data-testid="brain-pill"
      className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-slate-300"
    >
      <span className={`size-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
      {live ? t("pill.cloud") : t("pill.simulated")}
    </div>
  );
}

// Briefing falado: reads the newest briefing aloud once, on the first tap after
// opening the app (browsers block speech before any user interaction).
const SPOKEN_KEY = "qgzero.spokenBriefing";

function BriefingSpeaker() {
  const { data } = useQuery({
    queryKey: ["briefings"],
    queryFn: () => apiGet<Briefing[]>("/briefing"),
    refetchInterval: 60000,
    retry: false,
  });
  const latest = data?.[0];

  useEffect(() => {
    if (!latest || !TTS_SUPPORTED || localStorage.getItem(SPOKEN_KEY) === latest.id) return;
    const run = () => {
      localStorage.setItem(SPOKEN_KEY, latest.id);
      speak(latest.content);
    };
    window.addEventListener("pointerdown", run, { once: true });
    return () => window.removeEventListener("pointerdown", run);
  }, [latest]);

  return null;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh bg-background text-foreground">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-[#0B132B] px-4 py-5 lg:flex">
          <BrandMark />
          <nav className="mt-8 flex-1 space-y-1">
            {NAV.map(({ to, key, icon: Icon, tid, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                data-testid={tid}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 h-5 w-1 rounded-r bg-sky-400" />}
                    <Icon className="size-4" />
                    {t(key)}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="space-y-3">
            <BrainPill />
            <Toggles />
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-white/90 px-3 backdrop-blur lg:hidden">
          <BrandMark compact />
          <Toggles />
        </header>

        {/* Main content */}
        <main className="pb-20 pt-14 lg:pb-6 lg:pl-64 lg:pt-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-border bg-white/95 backdrop-blur lg:hidden">
          {NAV.map(({ to, key, icon: Icon, tid, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`${tid}-mobile`}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                  isActive ? "text-blue-600" : "text-slate-500"
                )
              }
            >
              <Icon className="size-5" />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <BriefingSpeaker />
        <Toaster />
      </div>
    </MotionConfig>
  );
}
