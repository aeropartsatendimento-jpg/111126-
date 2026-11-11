import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Show, SignOutButton, useAuth } from "@clerk/react";
import { ShieldAlert } from "lucide-react";

import { apiGet, setTokenGetter } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Me } from "@/lib/types";
import { Button } from "@/components/ui/button";

// Signed in + on the Chefe allowlist → app. Anyone else stops here.
function OwnerCheck({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTokenGetter(() => getToken());
    setReady(true);
    return () => {
      setTokenGetter(null);
      queryClient.clear(); // never leak one account's cache into the next login
    };
  }, [getToken, queryClient]);

  const { data: me, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<Me>("/me"),
    enabled: ready,
    retry: 1,
  });

  if (!ready || isLoading) return <div className="min-h-svh bg-background" data-testid="auth-loading" />;
  if (isError || !me?.is_owner) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6" data-testid="access-denied">
        <div className="max-w-sm space-y-4 rounded-xl border bg-white p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto size-10 text-amber-600" />
          <h1 className="font-heading text-xl font-bold">{t("auth.denied")}</h1>
          <p className="text-sm text-muted-foreground">{t("auth.deniedSub")}</p>
          {me?.emails?.length ? <p className="font-mono text-xs text-slate-500">{me.emails.join(", ")}</p> : null}
          <SignOutButton>
            <Button data-testid="access-denied-signout" variant="outline" className="w-full">
              {t("auth.signOut")}
            </Button>
          </SignOutButton>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <OwnerCheck>{children}</OwnerCheck>
      </Show>
      <Show when="signed-out">
        <Navigate to="/sign-in" replace />
      </Show>
    </>
  );
}
