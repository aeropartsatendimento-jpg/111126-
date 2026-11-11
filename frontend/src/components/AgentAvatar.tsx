import { AGENT_META } from "@/lib/agents";

interface Props {
  agentKey: string;
  active?: boolean;
  size?: number;
  className?: string;
}

export default function AgentAvatar({ agentKey, active = false, size = 40, className = "" }: Props) {
  const meta = AGENT_META[agentKey] ?? AGENT_META.system;
  const label =
    agentKey === "plus" ? "+" : agentKey === "user" ? "C" : agentKey === "system" ? "•" : agentKey.charAt(0).toUpperCase();

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} data-testid={`agent-avatar-${agentKey}`}>
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-heading font-semibold text-white"
        style={{ background: meta.gradient, fontSize: Math.max(11, size * 0.4) }}
      >
        {label}
      </span>
      {active && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
      )}
    </span>
  );
}
