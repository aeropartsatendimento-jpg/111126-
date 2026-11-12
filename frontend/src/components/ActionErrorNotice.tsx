import { AlertCircle, RefreshCw, X } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface ActionErrorNoticeProps {
  visible: boolean;
  pending: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  testId: string;
  mayDuplicate?: boolean;
}

export default function ActionErrorNotice({
  visible,
  pending,
  onRetry,
  onDismiss,
  testId,
  mayDuplicate = false,
}: ActionErrorNoticeProps) {
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      data-testid={`${testId}-error`}
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold" data-testid={`${testId}-error-title`}>{t("action.failedTitle")}</p>
          <p className="mt-0.5 text-[11px] text-red-700" data-testid={`${testId}-error-copy`}>{t("action.failedCopy")}</p>
          {mayDuplicate && (
            <p className="mt-1 text-[11px] font-semibold text-amber-800" data-testid={`${testId}-duplicate-warning`}>
              {t("action.duplicateWarning")}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-11 border-red-300 bg-white text-red-800 sm:h-8"
          data-testid={`${testId}-retry-button`}
          disabled={pending}
          onClick={onRetry}
        >
          <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
          {pending ? t("action.retrying") : t("action.retry")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-11 text-red-800 sm:h-8"
          data-testid={`${testId}-dismiss-button`}
          onClick={onDismiss}
        >
          <X className="size-3.5" aria-hidden="true" />
          {t("action.dismiss")}
        </Button>
      </div>
    </motion.div>
  );
}