import { ClipboardList, Radio, Building2, Droplets, Ruler, ShieldCheck, FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { useConfigStore } from "@/stores/configStore";
import { FormSection, BooleanToggle, NumberInput, SelectInput } from "@/components/ui/FormField";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export function ParameterePage() {
  const comm = useConfigStore((s) => s.config.communication);
  const setCommunication = useConfigStore((s) => s.setCommunication);
  const facility = useConfigStore((s) => s.config.facility);
  const setFacility = useConfigStore((s) => s.setFacility);
  const ops = useConfigStore((s) => s.config.operations);
  const setOperations = useConfigStore((s) => s.setOperations);
  const other = useConfigStore((s) => s.config.other_settings);
  const setOtherSettings = useConfigStore((s) => s.setOtherSettings);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <ClipboardList className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Prosjektgrunnlag</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Operating Assumptions */}
        <motion.div variants={fade}>
          <FormSection title="Driftsføresetnader" icon={<Building2 className="w-5 h-5 text-hydro-500" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberInput label="Vurderingsperiode" value={other.assessment_horizon_years} onChange={(v) => setOtherSettings({ assessment_horizon_years: v ?? 10 })} unit="år" min={1} max={30} step={1} />
              <NumberInput label="Tal tilsyn per år" value={ops.inspections_per_year} onChange={(v) => setOperations({ inspections_per_year: v })} unit="per år" min={1} max={52} step={1} />
            </div>
          </FormSection>
        </motion.div>

        {/* Site and Communications */}
        <motion.div variants={fade}>
          <FormSection title="Stad og kommunikasjon" icon={<Radio className="w-5 h-5 text-hydro-500" />}>
            <div className="grid gap-4 lg:grid-cols-3">
              <BooleanToggle label="4G-dekning på staden?" value={comm.has_4g_coverage} onChange={(v) => setCommunication({ has_4g_coverage: v })} />
              <BooleanToggle label="NB-IoT-dekning på staden?" value={comm.has_nbiot_coverage} onChange={(v) => setCommunication({ has_nbiot_coverage: v })} />
              <BooleanToggle label="Fri sikt til basestasjon innanfor 15 km?" value={comm.has_line_of_sight} onChange={(v) => setCommunication({ has_line_of_sight: v })} />
            </div>
          </FormSection>
        </motion.div>

        {/* Solution Category and Special Cases */}
        <motion.div variants={fade}>
          <FormSection title="Løysingskategori og spesialtilfelle" icon={<Building2 className="w-5 h-5 text-hydro-500" />}>
            <div className="space-y-4">
              <SelectInput
                label="1. Er anlegget nytt, eksisterande, eller ombygging/oppgradering?"
                value={facility.facility_status}
                onChange={(v) => setFacility({ facility_status: v })}
                options={[
                  { value: "nytt", label: "Nytt" },
                  { value: "eksisterande", label: "Eksisterande" },
                  { value: "ombygging", label: "Ombygging / oppgradering" },
                ]}
              />
              <SelectInput
                label="2. Er inntaket eit vanleg daminntak, eit Coanda-inntak, eller eit inntak med fiskepassasje?"
                value={facility.intake_type}
                onChange={(v) => setFacility({ intake_type: v })}
                options={[
                  { value: "vanleg_daminntak", label: "Vanleg daminntak" },
                  { value: "coandainntak", label: "Coanda-inntak" },
                ]}
              />
              <BooleanToggle label="3. Krev anlegget fiskepassasje?" value={facility.has_fish_passage} onChange={(v) => setFacility({ has_fish_passage: v })} />
            </div>
          </FormSection>
        </motion.div>

        {/* Water Release and Regulatory Requirements */}
        <motion.div variants={fade}>
          <FormSection title="Vasslepp og regulatoriske krav" icon={<Droplets className="w-5 h-5 text-hydro-500" />}>
            <div className="space-y-4">
              <NumberInput label="4. Kva er høgaste kravde minstevassføring?" value={facility.minimum_flow_ls} onChange={(v) => setFacility({ minimum_flow_ls: v })} unit="l/s" min={0} />
              <SelectInput
                label="5. Har anlegget fast minstevassføring, sesongkrav, eller tilsigsstyrt minstevassføring?"
                value={facility.flow_type}
                onChange={(v) => setFacility({ flow_type: v })}
                options={[
                  { value: "fast", label: "Fast minstevassføring" },
                  { value: "sesongkrav", label: "Sesongkrav" },
                  { value: "tilsigsstyrt", label: "Tilsigsstyrt minstevassføring" },
                ]}
              />
              <BooleanToggle label="6. Er det stor skilnad mellom lågaste og høgaste kravde sleppevassmengd?" value={facility.large_flow_difference} onChange={(v) => setFacility({ large_flow_difference: v })} />
              <BooleanToggle label="7. Kan minstevassføringa leiast nedstraums varegrinda og førast til eit frostfritt rom?" value={facility.can_divert_to_frost_free} onChange={(v) => setFacility({ can_divert_to_frost_free: v })} guidance="Ja favoriserer røyrslipp med intern måling og enklare frostbeskyting." />
              <BooleanToggle label="8. Er anlegget utsett for is, rask, sediment eller tilstopping?" value={facility.ice_problems} onChange={(v) => setFacility({ ice_problems: v })} />
              <BooleanToggle label="9. Er tilkomsten så vanskeleg at løysinga må driftast med minimalt tilsyn på staden?" value={facility.difficult_access} onChange={(v) => setFacility({ difficult_access: v })} />
              <BooleanToggle label="10. Må løysinga justerast ofte gjennom året?" value={facility.frequent_adjustment} onChange={(v) => setFacility({ frequent_adjustment: v })} />
            </div>
          </FormSection>
        </motion.div>

        {/* Measurement Solution */}
        <motion.div variants={fade}>
          <FormSection title="Måleløysing" icon={<Ruler className="w-5 h-5 text-hydro-500" />}>
            <div className="space-y-4">
              <BooleanToggle label="11. Finst det ein stabil naturleg måleprofil nedstraums slepppunktet?" value={facility.natural_measurement_profile} onChange={(v) => setFacility({ natural_measurement_profile: v })} />
              <BooleanToggle label="12. Kan ein kunstig måleprofil etablerast nedstraums slepppunktet?" value={facility.artificial_measurement_profile} onChange={(v) => setFacility({ artificial_measurement_profile: v })} />
            </div>
          </FormSection>
        </motion.div>

        {/* Additional Requirements */}
        <motion.div variants={fade}>
          <FormSection title="Tilleggskrav" icon={<ShieldCheck className="w-5 h-5 text-hydro-500" />}>
            <div className="space-y-4">
              <BooleanToggle label="13. Skal data lagrast automatisk og overførast til kontrollsystem eller alarmsystem?" value={facility.automatic_data_transmission} onChange={(v) => setFacility({ automatic_data_transmission: v })} />
              <BooleanToggle label="14. Skal publikum kunna kontrollera minstevassføringa på staden?" value={facility.public_verification} onChange={(v) => setFacility({ public_verification: v })} />
              <BooleanToggle label="15. Må tilsiget sleppast når kraftverket ikkje er i drift?" value={facility.release_when_not_operating} onChange={(v) => setFacility({ release_when_not_operating: v })} />
            </div>
          </FormSection>
        </motion.div>

        {/* Verification Measurements */}
        <motion.div variants={fade}>
          <FormSection title="Kontrollmålingar" icon={<FlaskConical className="w-5 h-5 text-hydro-500" />}>
            <div className="space-y-4">
              <BooleanToggle label="16. Er sleppevassmengda lita nok til at heile straumen kan samlast i ein behaldar?" value={facility.flow_collectible_in_container} onChange={(v) => setFacility({ flow_collectible_in_container: v })} />
              <BooleanToggle label="17. Er vassstraumen turbulent nok for sporstoff-fortyningsmåling?" value={facility.turbulent_for_tracer} onChange={(v) => setFacility({ turbulent_for_tracer: v })} />
              <BooleanToggle label="18. Er elveleiet jamt og djupt nok for areal-hastigheitsmåling?" value={facility.uniform_for_area_velocity} onChange={(v) => setFacility({ uniform_for_area_velocity: v })} />
              <BooleanToggle label="19. Er målepunktet eigna for gjentekne kontrollmålingar med låg uvisse?" value={facility.suitable_for_verification} onChange={(v) => setFacility({ suitable_for_verification: v })} guidance="Nei gjev lågare tillit til kontrollmålingar og kan utløysa strengare dokumentasjonskrav." />
            </div>
          </FormSection>
        </motion.div>
      </motion.div>
    </div>
  );
}
