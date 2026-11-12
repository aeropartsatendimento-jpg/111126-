import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Globe, Monitor, Server } from "lucide-react";
import { SiFacebook, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { toast } from "sonner";

import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Channel, McpInfo, SearchResponse } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import DataRegionState from "@/components/DataRegionState";

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
  const search = useMutation({
    mutationFn: (q: string) => apiPost<SearchResponse>("/channels/internet/search", { query: q }),
    onSuccess: (data) => setResults(data),
    onError: () => setResults(null),
  });

  const runSearch = () => {
    const q = query.trim();
    if (q) search.mutate(q);
  };

  return (
    <div className="mt-4 space-y-3 border-t pt-4" data-testid="search-panel">
      <p className="font-heading text-sm font-bold" data-testid="search-title">{t("search.title")}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="channel-search" className="sr-only">{t("search.input")}</label>
        <Input
          id="channel-search"
          data-testid="channel-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.input")}
          className="h-11"
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
        />
        <Button data-testid="channel-search-btn" className="h-11 w-full sm:w-auto" disabled={!query.trim() || search.isPending} onClick={runSearch}>
          {search.isPending ? t("search.searching") : t("search.btn")}
        </Button>
      </div>
      {search.isError && (
        <p className="text-sm text-red-600" data-testid="search-error">
          {t("search.error")}
        </p>
      )}
      {results && results.results.length === 0 && !search.isPending && (
        <p className="text-sm text-muted-foreground" data-testid="search-empty">
          {t("search.empty")}
        </p>
      )}
      <div className="space-y-2.5">
        {(results?.results ?? []).map((hit, i) => (
          <article key={hit.url + i} className="rounded-lg border p-3" data-testid={`search-result-item-${i}`}>
            <a href={hit.url} target="_blank" rel="noreferrer" data-testid={`search-result-link-${i}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline-offset-2 hover:underline">
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

        {channel.key === "visual" ? (
          <Link to="/navegador" data-testid="channel-visual-open-simulated" className={buttonVariants({ className: "w-full" })}>
            {t("visual.open")}
          </Link>
        ) : (
          <Button
            data-testid={`channel-${channel.key}-toggle`}
            variant={channel.status === "connected" ? "outline" : "default"}
            className="min-h-11 w-full"
            onClick={() =>
              patch.mutate({ status: channel.status === "connected" ? "disconnected" : "connected" })
            }
            disabled={patch.isPending}
          >
            {channel.status === "connected" ? t("channels.disconnect") : t("channels.connect")}
          </Button>
        )}

        {configField && (
          <div className="space-y-1.5">
            <Label htmlFor={`channel-${channel.key}-config`} className="text-xs text-muted-foreground">{t(configLabel)}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`channel-${channel.key}-config`}
                data-testid={`channel-${channel.key}-config-input`}
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                className="h-11 text-sm"
              />
              <Button
                data-testid={`channel-${channel.key}-config-save`}
                variant="secondary"
                size="sm"
                className="h-11 w-full sm:w-auto"
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

function McpServerCard() {
  const { t } = useI18n();
  const mcpQuery = useQuery({ queryKey: ["mcp-info"], queryFn: () => apiGet<McpInfo>("/mcp/info"), refetchInterval: 15000 });
  const data = mcpQuery.data;
  const url = `${window.location.origin}${data?.path ?? "/api/mcp"}`;
  return (
    <Card data-testid="mcp-server-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 font-heading text-base">
          {t("mcp.title")}
          {data && (
            <span
              data-testid="mcp-token-status"
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                data.token_configured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {data.token_configured ? t("mcp.tokenOn") : t("mcp.tokenOff")}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataRegionState query={mcpQuery} testId="mcp-info-data" />
        <div>
          <p className="text-xs font-semibold text-slate-500">{t("mcp.endpoint")}</p>
          <code className="mt-1 block break-all rounded-md bg-slate-900 px-3 py-2 font-mono text-xs text-sky-300" data-testid="mcp-endpoint">
            POST {url}
            <br />
            Authorization: Bearer ••••••
          </code>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">{t("mcp.tools")}</p>
          <div className="flex flex-wrap gap-1.5" data-testid="mcp-tools">
            {(data?.tools ?? []).map((tool) => (
              <span key={tool} className="rounded-md border bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700">
                {tool}
              </span>
            ))}
          </div>
        </div>
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
  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: () => apiGet<Channel[]>("/channels"),
    refetchInterval: 5000,
  });
  const channels = channelsQuery.data;

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-3 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="channels-title">
          {t("channels.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("channels.sub")}</p>
      </header>

      <DataRegionState query={channelsQuery} testId="channels-data" />
      {channels !== undefined && channels.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground" data-testid="channels-empty">{t("channels.empty")}</p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(channels ?? []).map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </div>

      <McpServerCard />
      <InfraCard />
    </div>
  );
}
