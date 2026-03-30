import { BookOpen, Shield, Wrench, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export function DokumentasjonPage() {
  const nve = useConfigStore((s) => s.nveRequirements);
  const tc = useConfigStore((s) => s.technicalComments);
  const q = useConfigStore((s) => s.questionnaire);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Dokumentasjon</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* NVE Requirements */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-hydro-500" />
            <h2 className="text-lg font-semibold text-hydro-900">NVE-krav</h2>
          </div>
          {nve ? (
            <dl className="space-y-2 text-sm">
              {Object.entries(nve).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1.5 border-b border-hydro-50">
                  <dt className="text-hydro-700 capitalize">{key.replace(/_/g, " ")}</dt>
                  <dd className="font-medium text-hydro-900 text-right max-w-[60%]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-hydro-700">Lastar data…</p>
          )}
        </motion.div>

        {/* Technical Comments */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-hydro-500" />
            <h2 className="text-lg font-semibold text-hydro-900">Tekniske kommentarar</h2>
          </div>
          {tc ? (
            <div className="space-y-4">
              {Object.entries(tc).map(([section, fields]) => (
                <div key={section}>
                  <h3 className="text-sm font-semibold text-hydro-700 capitalize mb-2">
                    {section.replace(/_/g, " ")}
                  </h3>
                  {typeof fields === "string" ? (
                    <p className="text-xs text-hydro-700 ml-3">{fields}</p>
                  ) : (
                    <dl className="ml-3 space-y-1 text-xs">
                      {Object.entries(fields as Record<string, string>).map(([key, comment]) => (
                        <div key={key} className="flex gap-3 py-1 border-b border-hydro-50/50">
                          <dt className="text-hydro-700 min-w-[140px] shrink-0">{key.replace(/_/g, " ")}</dt>
                          <dd className="text-hydro-700">{comment}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-hydro-700">Lastar data…</p>
          )}
        </motion.div>

        {/* Questionnaire Guidance */}
        <motion.div variants={fade} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-hydro-500" />
            <h2 className="text-lg font-semibold text-hydro-900">Spørjeskjemarettleiing</h2>
          </div>
          {q ? (
            <div className="space-y-4">
              {Object.entries(q).map(([section, items]) => (
                <div key={section}>
                  <h3 className="text-sm font-semibold text-hydro-700 capitalize mb-2">
                    {section.replace(/_/g, " ")}
                  </h3>
                  <div className="ml-3 space-y-2">
                    {(items as { field: string; question: string; guidance: string }[]).map((item) => (
                      <div key={item.field} className="text-xs border-b border-hydro-50/50 pb-2">
                        <p className="font-medium text-hydro-800">{item.question}</p>
                        <p className="text-hydro-700 mt-0.5">{item.guidance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-hydro-700">Lastar data…</p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
