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

export function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/oversikt" element={<DashboardPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
