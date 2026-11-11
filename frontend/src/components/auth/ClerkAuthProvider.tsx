import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";

// Brand Clerk here once: it styles sign-in, sign-up and the user menu.
const appearance = {
  variables: {
    colorPrimary: "#2563EB",
    colorForeground: "#0F172A",
    colorBackground: "#FFFFFF",
    borderRadius: "0.625rem",
    fontFamily: "'Plus Jakarta Sans Variable', sans-serif",
  },
};

// Vite proxies /api to the backend, so the config lives on a relative path.
const BACKEND_URL = "";

// Starts Clerk from the backend's runtime config, so deploy's live keys need no rebuild.
// Must render inside <BrowserRouter> so Clerk navigates without reloading.
export default function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<{ publishable_key: string; proxy_url: string } | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // Retries while the backend restarts (e.g. right after provisioning): the app's
  // Clerk components crash if they ever render without <ClerkProvider>.
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0): Promise<void> => {
      try {
        const cfg = await (await fetch(`${BACKEND_URL}/api/clerk/config`)).json();
        if (cfg.enabled) {
          if (!cancelled) setConfig(cfg);
          return;
        }
      } catch {
        /* retry below */
      }
      if (cancelled) return;
      if (attempt >= 20) {
        setUnavailable(true);
        return;
      }
      setTimeout(() => load(attempt + 1), 1500);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (unavailable) return <p style={{ padding: 24 }}>Sign-in is unavailable right now. Refresh the page to try again.</p>;
  if (!config) return null;
  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
