import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import type { Lang } from "@/lib/i18n";

export function formatWhen(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "dd/MM HH:mm", { locale: lang === "pt" ? ptBR : enUS });
}
