import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { PageTransition } from "./PageTransition";
import { useConfigStore } from "@/stores/configStore";

export function AppLayout() {
  const initialized = useConfigStore((s) => s.initialized);
  const initialize = useConfigStore((s) => s.initialize);
  useEffect(() => { if (!initialized) initialize(); }, [initialized, initialize]);

  return (
    <div className="flex min-h-screen bg-hydro-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
