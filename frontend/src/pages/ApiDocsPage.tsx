import { Code2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export function ApiDocsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Code2 className="w-7 h-7 text-hydro-600" />
          <h1 className="text-2xl font-bold text-hydro-900">API-dokumentasjon</h1>
        </div>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-hydro-700 hover:text-hydro-800 hover:bg-hydro-50 transition-colors"
        >
          Opne i ny fane
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <motion.div
        className="flex-1 min-h-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <iframe
          src="/docs"
          title="API Documentation"
          className="w-full h-[calc(100vh-10rem)] rounded-xl border border-hydro-200 bg-white"
        />
      </motion.div>
    </div>
  );
}
