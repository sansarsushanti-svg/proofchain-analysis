import "./index.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { InstrumentationProvider } from "./instrumentation";
import { VlyToolbar } from "../vly-toolbar-readonly";
import { AuthProvider } from "./contexts/AuthContext";

import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Analysis from "@/pages/Analysis";
import Results from "@/pages/Results";
import History from "@/pages/History";
import Reports from "@/pages/Reports";
import { RequireAuth } from "@/components/RequireAuth";

createRoot(document.getElementById("root")!).render(
  <InstrumentationProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/upload"
            element={
              <RequireAuth>
                <Upload />
              </RequireAuth>
            }
          />
          <Route
            path="/analysis/:sessionId"
            element={
              <RequireAuth>
                <Analysis />
              </RequireAuth>
            }
          />
          <Route
            path="/results/:sessionId"
            element={
              <RequireAuth>
                <Results />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <Reports />
              </RequireAuth>
            }
          />
        </Routes>
        <VlyToolbar />
      </BrowserRouter>
    </AuthProvider>
  </InstrumentationProvider>,
);
