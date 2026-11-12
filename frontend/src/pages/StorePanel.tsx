import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { StoreItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DataRegionState from "@/components/DataRegionState";

export const STORE_KINDS = [
  { kind: "stock", label: "store.stock", hot: "critical", cold: "ok" },
  { kind: "order", label: "store.order", hot: "open", cold: "done" },
  { kind: "coupon", label: "store.coupon", hot: "active", cold: "expired" },
] as const;

const HOT_STYLE: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  open: "border-blue-200 bg-blue-50 text-blue-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function KindColumn({ kind, label, hot, cold, items, dataReady }: { kind: string; label: string; hot: string; cold: string; items: StoreItem[]; dataReady: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["store"] });

  const add = useMutation({
    mutationFn: () => apiPost<StoreItem>("/store/items", { kind, title: title.trim(), value: value.trim(), status: hot }),
    onSuccess: () => {
      toast.success(t("store.added"));
      setTitle("");
      setValue("");
      refresh();
    },
    onError: () => toast.error(t("common.error")),
  });
  const toggle = useMutation({
    mutationFn: (it: StoreItem) => apiPatch<StoreItem>(`/store/items/${it.id}`, { status: it.status === hot ? cold : hot }),
    onSuccess: refresh,
    onError: () => toast.error(t("common.error")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/store/items/${id}`),
    onSuccess: refresh,
    onError: () => toast.error(t("common.error")),
  });

  const sorted = [...items].sort((a, b) => Number(b.status === hot) - Number(a.status === hot));

  return (
    <Card data-testid={`store-column-${kind}`}>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base">
          {t(label)} <span className="font-mono text-xs text-muted-foreground">· {items.filter((i) => i.status === hot).length} {t(`store.${hot}`).toLowerCase()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {dataReady && sorted.length === 0 && <p className="text-sm text-muted-foreground" data-testid={`store-${kind}-empty`}>{t("store.empty")}</p>}
        {sorted.map((it) => (
          <div key={it.id} data-testid={`store-item-${it.id}`} className="flex items-center gap-2 rounded-lg border bg-white p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {it.title}
                {it.is_sample && <span className="ml-1.5 rounded border border-dashed border-slate-300 px-1 text-[10px] font-medium text-slate-500">{t("store.sample")}</span>}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {it.value}
                {it.detail ? ` · ${it.detail}` : ""}
              </p>
            </div>
            <button
              data-testid={`store-toggle-${it.id}`}
              onClick={() => toggle.mutate(it)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                it.status === hot ? HOT_STYLE[hot] : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {t(`store.${it.status}`)}
            </button>
            <Button size="icon-sm" variant="ghost" data-testid={`store-delete-${it.id}`} onClick={() => remove.mutate(it.id)} aria-label="remove">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 border-t pt-3">
          <Input data-testid={`store-${kind}-title-input`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("store.itemTitle")} className="h-9 text-sm" />
          <Input data-testid={`store-${kind}-value-input`} value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("store.value")} className="h-9 w-28 text-sm" />
          <Button size="sm" className="h-9" data-testid={`store-${kind}-add-btn`} disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
            {t("store.add")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StorePanel() {
  const { t } = useI18n();
  const storeQuery = useQuery({ queryKey: ["store"], queryFn: () => apiGet<StoreItem[]>("/store/items"), refetchInterval: 5000 });
  const items = storeQuery.data;
  const all = items ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-3 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight" data-testid="store-title">
          {t("store.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("store.sub")}</p>
      </header>
      <DataRegionState query={storeQuery} testId="store-data" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STORE_KINDS.map((k) => (
          <KindColumn key={k.kind} {...k} items={all.filter((i) => i.kind === k.kind)} dataReady={items !== undefined} />
        ))}
      </div>
    </div>
  );
}
