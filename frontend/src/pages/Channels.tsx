import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Monitor, Server } from "lucide-react";
import { SiFacebook, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { toast } from "sonner";

import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Channel, SearchResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";

function ChannelIcon({ channelKey }: { channelKey: string }) {
  switch (channelKey) {
    case "whatsapp":
      return <SiWhatsapp className="size-5 text-[#25D366]" />;
    case "facebook":
      return <SiFacebook className="size-5 text-[#1877F2]" />;
    case "internet":
      return <Globe className="size-5 text-blue-600" />;
    case "visual":
      return <Monitor className="size-5 text-violet-600" />;
    default:
      return <Server className="size-5 text-slate-600" />;
  }
}

function SearchPanel() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setPending(true);
    setError(false);
    try {
      const data = await apiPost<SearchResponse>("/channels/internet/search", { query: q });
      setResults(data);
    } catch {
      setError(true);
      setResults(null);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t pt-4" data-testid="search-panel">
      <p className="font-heading text-sm font-bold">{t("search.title")}</p>
      <div className="flex gap-2">
        <Input
          data-testid="channel-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.input")}
          className="h-11"
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
        />
        <Button data-testid="channel-search-btn" className="h-11" disabled={!query.trim() || pending} onClick={search}>
          {pending ? t("search.searching") : t("search.btn")}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600" data-testid="search-error">
          {t("search.error")}
        </p>
      )}
      {results && results.results.length === 0 && !pending && (
        <p className="text-sm text-muted-foreground" data-testid="search-empty">
          {t("search.empty")}
        </p>
      )}
      <div className="space-y-2.5">
        {(results?.results ?? []).map((hit, i) => (
          <article key={hit.url + i} className="rounded-lg border p-3" data-testid={`search-result-item-${i}`}>
            <a href={hit.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 underline-offset-2 hover:underline">
              {hit.title}
            </a>
            <p className="mt-0.5 break-all font-mono text-[11px] text-emerald-700">{hit.url}</p>
            {hit.snippet && <p className="mt-1 text-xs text-muted-foreground">{hit.snippet}</p>}
          </article>
        ))}
      </div>
      {results && results.results.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {t("search.via")} · {results.engine}
        </p>
      )}
    </div>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const description = lang === "pt" ? channel.description_pt : channel.description_en;

  const configField = channel.key === "whatsapp" ? "phone" : channel.key === "facebook" ? "page_url" : channel.key === "mcp" ? "vps" : null;
  const configLabel = channel.key === "whatsapp" ? "channels.phone" : channel.key === "facebook" ? "channels.page" : "channels.vps";
  const [configValue, setConfigValue] = useState(configField ? (channel.config[configField] ?? "") : "");

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPatch<Channel>(`/channels/${channel.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success(t("channels.saved"));
    },
    onError: () => toast.error(t("channels.error")),
  });

  return (
    <Card data-testid={`channel-card-${channel.key}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <ChannelIcon channelKey={channel.key} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-bold" data-testid={`channel-name-${channel.key}`}>
              {channel.name}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <StatusBadge status={channel.status} testid={`channel-status-${channel.key}`} />
        </div>

        <Button
          data-testid={`channel-${channel.key}-toggle`}
          variant={channel.status === "connected" ? "outline" : "default"}
          className="w-full"
          onClick={() =>
            patch.mutate({ status: channel.status === "connected" ? "disconnected" : "connected" })
          }
          disabled={patch.isPending}
        >
          {channel.status === "connected" ? t("channels.disconnect") : t("channels.connect")}
        </Button>

        {configField && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t(configLabel)}</Label>
            <div className="flex gap-2">
              <Input
                data-testid={`channel-${channel.key}-config-input`}
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                className="h-9 text-sm"
              />
              <Button
                data-testid={`channel-${channel.key}-config-save`}
                variant="secondary"
                size="sm"
                className="h-9"
                disabled={patch.isPending}
                onClick={() => patch.mutate({ config: { ...channel.config, [configField]: configValue } })}
              >
                {t("channels.save")}
              </Button>
            </div>
          </div>
        )}

        {channel.key === "internet" && <SearchPanel />}
      </CardContent>
    </Card>
  );
}

function InfraCard() {
  const { t } = useI18n();
  const items: Array<{ key: string; label: string }> = [
    { key: "vps", label: t("infra.vps") },
    { key: "mcp", label: t("infra.mcp") },
    { key: "ssh", label: t("infra.ssh") },
    { key: "tmux", label: t("infra.tmux") },
  ];
  return (
    <Card data-testid="infra-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">{t("infra.title")}</CardTitle>
        <CardDescription>{t("infra.sub")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.key} data-testid={`infra-item-${item.key}`} className="flex items-center gap-2.5 rounded-lg border bg-white p-2.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{t("infra.ready")}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function Channels() {
  const { t } = useI18n();
  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: () => apiGet<Channel[]>("/channels"),
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-3 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="channels-title">
          {t("channels.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("channels.sub")}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(channels ?? []).map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </div>

      <InfraCard />
    </div>
  );
}
