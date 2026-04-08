import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  Settings,
  Zap,
  BarChart3,
  Radio,
  BookOpen,
  Code2,
  Droplets,
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

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-50 bg-hydro-900 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-6 h-6 text-hydro-300" />
          <span className="font-semibold text-lg">HydroGuide</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <nav className="absolute top-full left-0 right-0 bg-hydro-900 border-t border-hydro-800 shadow-xl pb-4">
          <ul className="space-y-1 px-3 pt-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-base transition-colors",
                      isActive
                        ? "bg-hydro-700/50 text-white"
                        : "text-hydro-200 hover:bg-hydro-800"
                    )
                  }
                >
                  <item.icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
