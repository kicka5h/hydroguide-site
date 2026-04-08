import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LandingPage } from "@/pages/LandingPage";

const AppLayout = lazy(() =>
  import("@/components/layout/AppLayout").then((m) => ({ default: m.AppLayout }))
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const ParameterePage = lazy(() =>
  import("@/pages/ParameterePage").then((m) => ({ default: m.ParameterePage }))
);
const SystemPage = lazy(() =>
  import("@/pages/SystemPage").then((m) => ({ default: m.SystemPage }))
);
const EffektbudsjettPage = lazy(() =>
  import("@/pages/EffektbudsjettPage").then((m) => ({ default: m.EffektbudsjettPage }))
);
const AnalysePage = lazy(() =>
  import("@/pages/AnalysePage").then((m) => ({ default: m.AnalysePage }))
);
const SiktlinjePage = lazy(() =>
  import("@/pages/SiktlinjePage").then((m) => ({ default: m.SiktlinjePage }))
);
const DokumentasjonPage = lazy(() =>
  import("@/pages/DokumentasjonPage").then((m) => ({ default: m.DokumentasjonPage }))
);
const ApiDocsPage = lazy(() =>
  import("@/pages/ApiDocsPage").then((m) => ({ default: m.ApiDocsPage }))
);

export function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/oversikt" element={<DashboardPage />} />
            <Route path="/prosjektgrunnlag" element={<ParameterePage />} />
            <Route path="/teknisk-parametre" element={<SystemPage />} />
            <Route path="/effektbudsjett" element={<EffektbudsjettPage />} />
            <Route path="/analyse" element={<AnalysePage />} />
            <Route path="/siktlinje" element={<SiktlinjePage />} />
            <Route path="/dokumentasjon" element={<DokumentasjonPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
