import { Radio, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export function SiktlinjePage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Radio className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Siktlinje</h1>
      </div>

      <motion.div
        className="glass rounded-2xl p-8 text-center max-w-lg mx-auto"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Radio className="w-12 h-12 text-hydro-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-hydro-900 mb-2">
          Siktlinjekalkulator
        </h2>
        <p className="text-sm text-hydro-700 mb-4">
          Reknar ut om det er fri sikt mellom to punkt for radiosamband.
          Brukast for å avgjere om radiokommunikasjon er mogleg mellom
          målestasjonen og basestasjonen.
        </p>
        <p className="text-xs text-hydro-700 mb-6">
          Funksjonen kjem snart. Bruk NKOM si løysing i mellomtida:
        </p>
        <a
          href="https://finnsenderen.no"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-hydro-700 text-white text-sm font-medium hover:bg-hydro-800 transition-colors"
        >
          NKOM Finnsenderen
          <ExternalLink className="w-4 h-4" />
        </a>
      </motion.div>
    </div>
  );
}
