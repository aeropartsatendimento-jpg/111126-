import { AlertTriangle, CloudOff, LoaderCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface QueryStateLike {
  data: unknown;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

interface DataRegionStateProps {
  query: QueryStateLike;
  testId: string;
  className?: string;
}

export default function DataRegionState({ query, testId, className }: DataRegionStateProps) {
  const { t } = useI18n();
  const hasData = query.data !== undefined;

  if (query.isPending && !hasData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        role="status"
        aria-live="polite"
        data-testid={`${testId}-loading`}
        className={cn("flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-600", className)}
      >
        <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        <span className="text-xs font-medium" data-testid={`${testId}-loading-copy`}>{t("data.loading")}</span>
      </motion.div>
    );
  }

  if (query.isError && !hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        role="alert"
        data-testid={`${testId}-unavailable`}
        className={cn("flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-red-800", className)}
      >
        <CloudOff className="size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-40 flex-1">
          <p className="text-xs font-bold" data-testid={`${testId}-unavailable-title`}>{t("data.unavailableTitle")}</p>
          <p className="text-[11px] text-red-700" data-testid={`${testId}-unavailable-copy`}>{t("data.unavailableCopy")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-11 border-red-300 bg-white text-red-800 hover:bg-red-100 sm:h-8"
          data-testid={`${testId}-retry-button`}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={cn("size-3.5", query.isFetching && "animate-spin")} aria-hidden="true" />
          {query.isFetching ? t("data.retrying") : t("data.retry")}
        </Button>
      </motion.div>
    );
  }

  if (query.isError && hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
        aria-live="polite"
        data-testid={`${testId}-stale`}
        className={cn("flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900", className)}
      >
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-40 flex-1">
          <p className="text-xs font-bold" data-testid={`${testId}-stale-title`}>{t("data.staleTitle")}</p>
          <p className="text-[11px] text-amber-800" data-testid={`${testId}-stale-copy`}>{t("data.staleCopy")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-11 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 sm:h-8"
          data-testid={`${testId}-retry-button`}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className={cn("size-3.5", query.isFetching && "animate-spin")} aria-hidden="true" />
          {query.isFetching ? t("data.retrying") : t("data.retry")}
        </Button>
      </motion.div>
    );
  }

  return null;
}