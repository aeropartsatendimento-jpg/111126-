import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { LanguageProvider } from "@/lib/i18n";
import AppShell from "@/components/AppShell";
import Cockpit from "@/pages/Cockpit";
import Room from "@/pages/Room";
import Tasks from "@/pages/Tasks";
import ZeroDirect from "@/pages/ZeroDirect";
import Channels from "@/pages/Channels";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <LanguageProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Cockpit />} />
            <Route path="/sala" element={<Room />} />
            <Route path="/tarefas" element={<Tasks />} />
            <Route path="/zero" element={<ZeroDirect />} />
            <Route path="/canais" element={<Channels />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </LanguageProvider>
    </ThemeProvider>
  );
}
