import { Droplets } from "lucide-react";
import { WaveDivider } from "@/components/layout/WaveDivider";

export function Footer() {
  return (
    <footer className="relative bg-hydro-900 text-hydro-200">
      <WaveDivider color="#0c4a6e" flip className="bg-hydro-50" />

      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Droplets className="w-5 h-5 text-hydro-300" />
          <span className="font-semibold text-white">HydroGuide</span>
        </div>

        <p className="text-sm mb-2">
          Laget med omhu av Nikolas, Dan Roald, Jinn-Marie og Espen
        </p>
        <p className="text-sm text-hydro-300">
          Fagskulen Vestland &middot; Hovedprosjekt 2026
        </p>

        <div className="mt-8 pt-6 border-t border-hydro-700 text-xs text-hydro-300">
          &copy; {new Date().getFullYear()} HydroGuide. Alle rettigheter reservert.
        </div>
      </div>
    </footer>
  );
}
