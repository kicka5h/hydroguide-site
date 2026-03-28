import { motion } from "framer-motion";
import {
  MapPin,
  Zap,
  Radio,
  BarChart3,
  Shield,
  Download,
} from "lucide-react";
const waterBg = new URL("@/assets/water-sm.jpg", import.meta.url).href;

const FEATURES = [
  {
    icon: MapPin,
    title: "Lokasjon og kommunikasjon",
    description:
      "Kartbasert valg av inntakspunkt med automatisk vurdering av 4G, NB-IoT og siktlinje.",
  },
  {
    icon: Zap,
    title: "Energidimensjonering",
    description:
      "Beregn solcelle-, batteri- og reservestrombehov basert pa effektbudsjett og solinnstraling.",
  },
  {
    icon: Radio,
    title: "Siktlinjeberegning",
    description:
      "Interaktiv radiolinjeplanlegger med Fresnel-sone, regndemping og frittromsdemping.",
  },
  {
    icon: BarChart3,
    title: "Analyse og anbefaling",
    description:
      "Regelbasert analyse som evaluerer konfigurasjonen mot NVEs retningslinjer.",
  },
  {
    icon: Shield,
    title: "NVE-samsvar",
    description:
      "Bygget rundt Veileder 3/2020 og retningslinjer for hydrologiske undersokelser.",
  },
  {
    icon: Download,
    title: "Eksport og deling",
    description:
      "Lagre, last opp og eksporter konfigurasjoner. Importer eksisterende Excel-filer.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-28 px-6 bg-hydro-50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-hydro-900 mb-4">
            Alt du trenger i ett verktoy
          </h2>
          <p className="text-hydro-600 max-w-2xl mx-auto text-lg">
            Fra parameterkartlegging til energibalanse — HydroGuide samler alle beregninger pa ett sted.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative glass rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Water splash background image on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-500 pointer-events-none bg-cover bg-center rounded-2xl"
                style={{ backgroundImage: `url(${waterBg})` }}
              />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hydro-500 to-teal-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-hydro-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-hydro-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
