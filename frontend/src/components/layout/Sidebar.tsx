import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Zap,
  BarChart3,
  Radio,
  BookOpen,
  Code2,
  Droplets,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/oversikt", label: "Oversikt", icon: LayoutDashboard },
  { to: "/prosjektgrunnlag", label: "Prosjektgrunnlag", icon: ClipboardList },
  { to: "/teknisk-parametre", label: "Teknisk Parametre", icon: Settings },
  { to: "/effektbudsjett", label: "Effektbudsjett", icon: Zap },
  { to: "/analyse", label: "Analyse", icon: BarChart3 },
  { to: "/siktlinje", label: "Siktlinje", icon: Radio },
  { to: "/dokumentasjon", label: "Dokumentasjon", icon: BookOpen },
  { to: "/api-docs", label: "API", icon: Code2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 bg-hydro-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-hydro-800">
        <Droplets className="w-8 h-8 text-hydro-300 shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-xl tracking-tight">HydroGuide</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base transition-colors",
                    isActive
                      ? "bg-hydro-700/50 text-white border-l-2 border-hydro-300"
                      : "text-hydro-200 hover:bg-hydro-800 hover:text-white"
                  )
                }
              >
                <item.icon className="w-6 h-6 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center gap-2 px-4 py-3 border-t border-hydro-800 text-hydro-300 hover:text-white transition-colors"
      >
        {collapsed ? (
          <PanelLeftOpen className="w-5 h-5" />
        ) : (
          <>
            <PanelLeftClose className="w-5 h-5" />
            <span className="text-sm">Skjul</span>
          </>
        )}
      </button>
    </aside>
  );
}
