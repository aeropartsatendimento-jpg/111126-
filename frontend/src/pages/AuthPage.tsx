import { SignIn, SignUp } from "@clerk/react";
import { useI18n } from "@/lib/i18n";

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0B132B] p-10 text-white lg:flex">
        <div className="universe-stars absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg font-heading text-xl font-bold" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)" }}>
            Z
          </span>
          <span className="font-heading text-lg font-bold">{t("brand.title")}</span>
        </div>
        <div className="relative space-y-3">
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight">{t("auth.hero")}</h1>
          <p className="max-w-md text-slate-300">{t("auth.heroSub")}</p>
        </div>
        <p className="relative text-xs text-slate-500">Zero · Pro · Jarvis · Luna · Plus</p>
      </aside>
      <main className="flex items-center justify-center p-4" data-testid={`${mode}-page`}>
        {mode === "sign-in" ? (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp />
        ) : (
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        )}
      </main>
    </div>
  );
}
