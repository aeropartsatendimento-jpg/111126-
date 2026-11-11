import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { LanguageProvider } from "@/lib/i18n";
import AppShell from "@/components/AppShell";
import AuthGate from "@/components/auth/AuthGate";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import AuthPage from "@/pages/AuthPage";
import MemoryPage from "@/pages/MemoryPage";
import Universe from "@/pages/Universe";
import Cockpit from "@/pages/Cockpit";
import Room from "@/pages/Room";
import Tasks from "@/pages/Tasks";
import ZeroDirect from "@/pages/ZeroDirect";
import Channels from "@/pages/Channels";
import Projects from "@/pages/Projects";
import StorePanel from "@/pages/StorePanel";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <LanguageProvider>
        <ClerkAuthProvider>
          <Routes>
            <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
            <Route
              path="*"
              element={
                <AuthGate>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<Cockpit />} />
                      <Route path="/sala" element={<Room />} />
                      <Route path="/tarefas" element={<Tasks />} />
                      <Route path="/zero" element={<ZeroDirect />} />
                      <Route path="/canais" element={<Channels />} />
                      <Route path="/projetos" element={<Projects />} />
                      <Route path="/loja" element={<StorePanel />} />
                      <Route path="/universo" element={<Universe />} />
                      <Route path="/memoria" element={<MemoryPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppShell>
                </AuthGate>
              }
            />
          </Routes>
        </ClerkAuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
