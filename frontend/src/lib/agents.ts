// Visual identity per agent/key, straight from the design guidelines.

export const AGENT_META: Record<string, { gradient: string; badge: string }> = {
  zero: { gradient: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  pro: { gradient: "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)", badge: "bg-violet-100 text-violet-800 border-violet-200" },
  jarvis: { gradient: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)", badge: "bg-green-100 text-green-800 border-green-200" },
  aluna: { gradient: "linear-gradient(135deg, #BE185D 0%, #EC4899 100%)", badge: "bg-pink-100 text-pink-800 border-pink-200" },
  plus: { gradient: "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)", badge: "bg-amber-100 text-amber-900 border-amber-200" },
  user: { gradient: "linear-gradient(135deg, #334155 0%, #64748B 100%)", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  system: { gradient: "linear-gradient(135deg, #0F172A 0%, #475569 100%)", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

const NAMES: Record<string, string> = {
  zero: "Zero",
  pro: "Pro",
  jarvis: "Jarvis",
  aluna: "Luna",
  plus: "Plus",
};

export function agentLabel(key: string, t: (k: string) => string): string {
  if (key === "user") return t("agent.user");
  if (key === "system") return t("agent.system");
  return NAMES[key] ?? key;
}

export const SQUAD_ORDER = ["zero", "pro", "jarvis", "aluna", "plus"] as const;
export const WORKER_ORDER = ["jarvis", "aluna", "plus"] as const;
