import { ClipboardList, Radio, Building2, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { FormSection, BooleanToggle, NumberInput, SelectInput } from "@/components/ui/FormField";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function guidanceFor(section: string, field: string): string | undefined {
  const q = useConfigStore.getState().questionnaire;
  if (!q) return undefined;
  const items = (q as unknown as Record<string, { field: string; guidance: string }[]>)[section];
  return items?.find((i) => i.field === field)?.guidance;
}

export function ParameterePage() {
  const comm = useConfigStore((s) => s.config.communication);
  const setCommunication = useConfigStore((s) => s.setCommunication);
  const facility = useConfigStore((s) => s.config.facility);
  const setFacility = useConfigStore((s) => s.setFacility);
  const ops = useConfigStore((s) => s.config.operations);
  const setOperations = useConfigStore((s) => s.setOperations);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <ClipboardList className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Parametere</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fade}>
          <FormSection title="Kommunikasjon" icon={<Radio className="w-5 h-5 text-hydro-500" />}>
            <BooleanToggle label="4G-dekning på staden?" value={comm.has_4g_coverage} onChange={(v) => setCommunication({ has_4g_coverage: v })} guidance={guidanceFor("communication", "has_4g_coverage")} />
            <BooleanToggle label="NB-IoT-dekning på staden?" value={comm.has_nbiot_coverage} onChange={(v) => setCommunication({ has_nbiot_coverage: v })} guidance={guidanceFor("communication", "has_nbiot_coverage")} />
            <BooleanToggle label="Fri sikt < 15 km til basestasjon?" value={comm.has_line_of_sight} onChange={(v) => setCommunication({ has_line_of_sight: v })} guidance={guidanceFor("communication", "has_line_of_sight")} />
            <BooleanToggle label="Toveis styring nødvendig?" value={comm.requires_two_way_control} onChange={(v) => setCommunication({ requires_two_way_control: v })} guidance={guidanceFor("communication", "requires_two_way_control")} />
          </FormSection>
        </motion.div>

        <motion.div variants={fade}>
          <FormSection title="Anleggstype og sleppmetode" icon={<Building2 className="w-5 h-5 text-hydro-500" />}>
            <SelectInput
              label="Sleppmetode"
              value={facility.release_method}
              onChange={(v) => setFacility({ release_method: v })}
              options={[
                { value: "Pipe via intake", label: "Røyr via inntak" },
                { value: "Open channel", label: "Open kanal" },
                { value: "Coanda screen", label: "Coanda-rist" },
                { value: "Orifice plate", label: "Blende" },
              ]}
              guidance={guidanceFor("facility", "release_method")}
            />
            <BooleanToggle label="Fiskepassasje ved inntak?" value={facility.has_fish_passage} onChange={(v) => setFacility({ has_fish_passage: v })} guidance={guidanceFor("facility", "has_fish_passage")} />
            <NumberInput label="Kravd minstevassføring" value={facility.minimum_flow_ls} onChange={(v) => setFacility({ minimum_flow_ls: v })} unit="l/s" min={0} guidance={guidanceFor("facility", "minimum_flow_ls")} />
            <BooleanToggle label="Låg leiingsevne i vatnet?" value={facility.low_conductivity} onChange={(v) => setFacility({ low_conductivity: v })} guidance={guidanceFor("facility", "low_conductivity")} />
            <BooleanToggle label="Isproblem ved målestaden?" value={facility.ice_problems} onChange={(v) => setFacility({ ice_problems: v })} guidance={guidanceFor("facility", "ice_problems")} />
            <BooleanToggle label="Vanskeleg tilkomst til inntak?" value={facility.difficult_access} onChange={(v) => setFacility({ difficult_access: v })} guidance={guidanceFor("facility", "difficult_access")} />
            <BooleanToggle label="Lineær strøyming ved målestaden?" value={facility.linear_flow} onChange={(v) => setFacility({ linear_flow: v })} guidance={guidanceFor("facility", "linear_flow")} />
            <BooleanToggle label="Sediment- eller svallproblem?" value={facility.sediment_or_surge} onChange={(v) => setFacility({ sediment_or_surge: v })} guidance={guidanceFor("facility", "sediment_or_surge")} />
          </FormSection>
        </motion.div>

        <motion.div variants={fade}>
          <FormSection title="Drift og inspeksjon" icon={<Wrench className="w-5 h-5 text-hydro-500" />}>
            <NumberInput label="Tal tilsyn per år" value={ops.inspections_per_year} onChange={(v) => setOperations({ inspections_per_year: v })} min={1} max={52} step={1} guidance={guidanceFor("operations", "inspections_per_year")} />
            <NumberInput label="Batteribank" value={ops.battery_bank_ah} onChange={(v) => setOperations({ battery_bank_ah: v })} unit="Ah" min={0} guidance={guidanceFor("operations", "battery_bank_ah")} />
            <BooleanToggle label="Ønskt nullutslepp (metanol)?" value={ops.zero_emission_desired} onChange={(v) => setOperations({ zero_emission_desired: v })} guidance={guidanceFor("operations", "zero_emission_desired")} />
          </FormSection>
        </motion.div>
      </motion.div>
    </div>
  );
}
