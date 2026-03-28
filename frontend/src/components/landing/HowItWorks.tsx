import { motion } from "framer-motion";
import { ClipboardList, Calculator, BarChart3, FileDown } from "lucide-react";

const STEPS = [
  {
    number: 1,
    icon: ClipboardList,
    title: "Definer parametere",
    description: "Svar pa sporsmal om lokasjon, kommunikasjon, inntakstype og vannforing.",
  },
  {
    number: 2,
    icon: Calculator,
    title: "Beregn energibehov",
    description: "Sett opp effektbudsjettet og la systemet beregne solcelle- og batteridimensjonering.",
  },
  {
    number: 3,
    icon: BarChart3,
    title: "Analyser konfigurasjonen",
    description: "Fa anbefalinger basert pa NVE-retningslinjer og energibalanse.",
  },
  {
    number: 4,
    icon: FileDown,
    title: "Eksporter rapport",
    description: "Last ned konfigurasjon og resultater som JSON eller PDF.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-28 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-hydro-900 mb-4">
            Slik fungerer det
          </h2>
          <p className="text-hydro-600 text-lg">
            Fire steg fra tom konfigurasjon til ferdig rapport.
          </p>
        </motion.div>

        <div className="relative">
          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative flex items-start gap-6 md:gap-12"
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {/* Number circle */}
                <div className="relative z-10 shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-hydro-500 to-teal-500 flex items-center justify-center shadow-lg shadow-hydro-500/20">
                  <step.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <div className="pt-2">
                  <div className="text-sm font-semibold text-hydro-500 mb-1">
                    Steg {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-hydro-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-hydro-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
