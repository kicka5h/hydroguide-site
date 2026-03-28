import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Droplets } from "lucide-react";
import { WaveDivider } from "@/components/layout/WaveDivider";

function Particles() {
  const particles = Array.from({ length: 35 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 4 + Math.random() * 8,
    duration: 3 + Math.random() * 5,
    delay: Math.random() * 2,
    opacity: 0.2 + Math.random() * 0.4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-hydro-300 animate-float-up"
          style={{
            left: p.left,
            bottom: "-20px",
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            "--duration": `${p.duration}s`,
            "--delay": `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-hydro-950 via-hydro-900 to-hydro-800 overflow-hidden">
      <Particles />

      <motion.div
        className="relative z-10 text-center px-6 max-w-4xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="flex items-center justify-center gap-3 mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Droplets className="w-12 h-12 text-hydro-300" />
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
          HydroGuide
        </h1>

        <p className="text-lg md:text-xl text-hydro-200 mb-4 max-w-2xl mx-auto leading-relaxed">
          Intelligent dimensjonering av overvakingssystemer for smakraftverk
        </p>

        <p className="text-sm md:text-base text-hydro-400 mb-10 max-w-xl mx-auto">
          Planlegg og dimensjoner malestasjon for minstevannforing i henhold til NVE-retningslinjer
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/oversikt")}
            className="px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-hydro-500 to-teal-500 hover:from-hydro-400 hover:to-teal-400 shadow-lg shadow-hydro-500/25 transition-all hover:shadow-xl hover:shadow-hydro-500/30 hover:-translate-y-0.5"
          >
            Kom i gang
          </button>
          <button
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-8 py-3.5 rounded-xl font-semibold text-hydro-200 border border-hydro-600 hover:bg-hydro-800/50 hover:text-white transition-all"
          >
            Les mer
          </button>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="w-6 h-6 text-hydro-400" />
      </motion.div>

      <div className="absolute bottom-0 w-full z-10">
        <WaveDivider color="#f0f9ff" />
      </div>
    </section>
  );
}
