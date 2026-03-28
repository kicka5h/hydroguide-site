import { motion } from "framer-motion";
import { User } from "lucide-react";

const TEAM = [
  { name: "Nikolas Olsen", role: "Utvikler" },
  { name: "Dan Roald Larsen", role: "Utvikler" },
  { name: "Jinn-Marie Bakke", role: "Utvikler" },
  { name: "Espen Espenland", role: "Utvikler" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function TeamSection() {
  return (
    <section className="py-20 md:py-28 px-6 bg-hydro-50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-hydro-900 mb-4">
            Teamet
          </h2>
          <p className="text-hydro-600 text-lg">
            Utviklet som avsluttende hovedprosjekt ved Fagskulen Vestland, 2026.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false }}
        >
          {TEAM.map((member) => (
            <motion.div
              key={member.name}
              variants={item}
              className="glass rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-hydro-200 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-hydro-600" />
              </div>
              <h3 className="font-semibold text-hydro-900 text-sm">
                {member.name}
              </h3>
              <p className="text-hydro-500 text-xs mt-1">{member.role}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
