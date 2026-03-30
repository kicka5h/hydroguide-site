import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Math } from "@/components/ui/Math";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fade} className="glass rounded-2xl p-6">
      <h2 className="text-xl font-bold text-hydro-900 mb-6 pb-2 border-b border-hydro-100">{title}</h2>
      <div className="space-y-8">{children}</div>
    </motion.div>
  );
}

function Article({ title, description, formula, vars }: {
  title: string;
  description: string;
  formula: string;
  vars: [string, string][];
}) {
  return (
    <article className="border-t border-hydro-50 pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-base font-bold text-hydro-900">{title}</h3>
      <p className="mt-1 text-sm text-hydro-700">{description}</p>
      <Math display>{formula}</Math>
      <div className="mt-4">
        <p className="text-sm font-bold text-hydro-900 mb-2">Forklaringar</p>
        <table className="w-full text-left">
          <tbody>
            {vars.map(([sym, desc]) => (
              <tr key={desc} className="border-t border-hydro-50 first:border-t-0">
                <td className="w-28 sm:w-36 whitespace-nowrap py-2 pr-4 align-top text-sm font-semibold text-hydro-900">
                  <Math>{sym}</Math>
                </td>
                <td className="py-2 align-top text-sm text-hydro-700">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

// ── MathML fragments ──────────────────────────────────────────────
// Power Budget: I = P / V_nom,  E_dag = P · t,  Q_dag = I · t
const POWER_BUDGET = `
<mi>I</mi><mo>=</mo>
<mfrac><mi>P</mi><msub><mi>V</mi><mrow><mi>n</mi><mi>o</mi><mi>m</mi></mrow></msub></mfrac>
<mo>,</mo><mspace width="2em"/>
<msub><mi>E</mi><mrow><mi>d</mi><mi>a</mi><mi>g</mi></mrow></msub>
<mo>=</mo><mi>P</mi><mo>&#x22C5;</mo><mi>t</mi>
<mo>,</mo><mspace width="2em"/>
<msub><mi>Q</mi><mrow><mi>d</mi><mi>a</mi><mi>g</mi></mrow></msub>
<mo>=</mo><mi>I</mi><mo>&#x22C5;</mo><mi>t</mi>`;

// Solar: E_sol = G · P_panel · n_panel · η_system
const SOLAR = `
<msub><mi>E</mi><mrow><mi>s</mi><mi>o</mi><mi>l</mi></mrow></msub>
<mo>=</mo><mi>G</mi><mo>&#x22C5;</mo>
<msub><mi>P</mi><mrow><mi>p</mi><mi>a</mi><mi>n</mi><mi>e</mi><mi>l</mi></mrow></msub>
<mo>&#x22C5;</mo>
<msub><mi>n</mi><mrow><mi>p</mi><mi>a</mi><mi>n</mi><mi>e</mi><mi>l</mi></mrow></msub>
<mo>&#x22C5;</mo>
<msub><mi>&#x03B7;</mi><mrow><mi>s</mi><mi>y</mi><mi>s</mi><mi>t</mi><mi>e</mi><mi>m</mi></mrow></msub>`;

// Consumption & deficit
const CONSUMPTION = `
<msub><mi>E</mi><mrow><mi>f</mi><mi>o</mi><mi>r</mi><mi>b</mi><mi>r</mi><mi>u</mi><mi>k</mi></mrow></msub>
<mo>=</mo>
<msub><mi>E</mi><mrow><mi>d</mi><mi>a</mi><mi>g</mi></mrow></msub>
<mo>&#x22C5;</mo>
<msub><mi>n</mi><mrow><mi>d</mi><mi>a</mi><mi>g</mi><mi>e</mi><mi>r</mi></mrow></msub>
<mo>,</mo><mspace width="2em"/>
<msub><mi>E</mi><mrow><mi>u</mi><mi>n</mi><mi>d</mi><mi>e</mi><mi>r</mi><mi>s</mi><mi>k</mi><mi>u</mi><mi>d</mi><mi>d</mi></mrow></msub>
<mo>=</mo>
<msub><mi>E</mi><mrow><mi>f</mi><mi>o</mi><mi>r</mi><mi>b</mi><mi>r</mi><mi>u</mi><mi>k</mi></mrow></msub>
<mo>&#x2212;</mo>
<msub><mi>E</mi><mrow><mi>s</mi><mi>o</mi><mi>l</mi></mrow></msub>`;

// Balance
const BALANCE = `
<msub><mi>E</mi><mrow><mi>b</mi><mi>a</mi><mi>l</mi></mrow></msub>
<mo>=</mo>
<msub><mi>E</mi><mrow><mi>s</mi><mi>o</mi><mi>l</mi></mrow></msub>
<mo>&#x2212;</mo>
<msub><mi>E</mi><mrow><mi>f</mi><mi>o</mi><mi>r</mi><mi>b</mi><mi>r</mi><mi>u</mi><mi>k</mi></mrow></msub>`;

// Runtime hours
const RUNTIME = `
<msub><mi>t</mi><mrow><mi>d</mi><mi>r</mi><mi>i</mi><mi>f</mi><mi>t</mi></mrow></msub>
<mo>=</mo>
<mfrac>
  <msub><mi>E</mi><mrow><mi>u</mi><mi>n</mi><mi>d</mi><mi>e</mi><mi>r</mi><mi>s</mi><mi>k</mi><mi>u</mi><mi>d</mi><mi>d</mi></mrow></msub>
  <msub><mi>P</mi><mrow><mi>s</mi><mi>e</mi><mi>k</mi></mrow></msub>
</mfrac>
<mo>,</mo><mspace width="2em"/>
<msub><mi>t</mi><mrow><mi>t</mi><mi>o</mi><mi>t</mi></mrow></msub>
<mo>=</mo><mo>&#x2211;</mo>
<msub><mi>t</mi><mrow><mi>d</mi><mi>r</mi><mi>i</mi><mi>f</mi><mi>t</mi></mrow></msub>`;

// Fuel consumption & cost
const FUEL = `
<mi>F</mi><mo>=</mo>
<msub><mi>E</mi><mrow><mi>u</mi><mi>n</mi><mi>d</mi><mi>e</mi><mi>r</mi><mi>s</mi><mi>k</mi><mi>u</mi><mi>d</mi><mi>d</mi></mrow></msub>
<mo>&#x22C5;</mo>
<msub><mi>r</mi><mrow><mi>f</mi><mi>o</mi><mi>r</mi><mi>b</mi><mi>r</mi><mi>u</mi><mi>k</mi></mrow></msub>
<mtext>&#xA0;</mtext><mtext>eller</mtext>
<mo>&#x21D2;</mo><mtext>&#xA0;</mtext>
<mi>F</mi><mo>=</mo>
<msub><mi>t</mi><mrow><mi>d</mi><mi>r</mi><mi>i</mi><mi>f</mi><mi>t</mi></mrow></msub>
<mo>&#x22C5;</mo>
<msub><mi>P</mi><mrow><mi>s</mi><mi>e</mi><mi>k</mi></mrow></msub>
<mo>&#x22C5;</mo>
<msub><mi>r</mi><mrow><mi>f</mi><mi>o</mi><mi>r</mi><mi>b</mi><mi>r</mi><mi>u</mi><mi>k</mi></mrow></msub>
<mo>,</mo><mspace width="2em"/>
<msub><mi>C</mi><mrow><mi>d</mi><mi>r</mi><mi>i</mi><mi>v</mi><mi>s</mi><mi>t</mi><mi>o</mi><mi>f</mi><mi>f</mi></mrow></msub>
<mo>=</mo><mi>F</mi><mo>&#x22C5;</mo>
<msub><mi>p</mi><mrow><mi>d</mi><mi>r</mi><mi>i</mi><mi>v</mi><mi>s</mi><mi>t</mi><mi>o</mi><mi>f</mi><mi>f</mi></mrow></msub>`;

// Battery capacity
const BATTERY = `
<msub><mi>C</mi><mrow><mi>b</mi><mi>a</mi><mi>t</mi><mi>t</mi></mrow></msub>
<mo>=</mo>
<mfrac>
  <mrow>
    <msub><mi>E</mi><mrow><mi>d</mi><mi>a</mi><mi>g</mi></mrow></msub>
    <mo>&#x22C5;</mo>
    <msub><mi>n</mi><mrow><mi>a</mi><mi>u</mi><mi>t</mi><mi>o</mi><mi>n</mi><mi>o</mi><mi>m</mi><mi>i</mi></mrow></msub>
  </mrow>
  <mrow>
    <msub><mi>V</mi><mrow><mi>n</mi><mi>o</mi><mi>m</mi></mrow></msub>
    <mo>&#x22C5;</mo><mi>D</mi><mi>o</mi><mi>D</mi>
  </mrow>
</mfrac>`;

// TCO
const TCO = `
<mi>T</mi><mi>O</mi><mi>C</mi><mo>=</mo>
<msub><mi>C</mi><mrow><mi>i</mi><mi>n</mi><mi>n</mi><mi>k</mi><mi>j</mi><mi>&#xF8;</mi><mi>p</mi></mrow></msub>
<mo>+</mo><mi>H</mi><mo>&#x22C5;</mo>
<mo>(</mo>
<msub><mi>C</mi><mrow><mi>d</mi><mi>r</mi><mi>i</mi><mi>v</mi><mi>s</mi><mi>t</mi><mi>o</mi><mi>f</mi><mi>f</mi></mrow></msub>
<mo>+</mo>
<msub><mi>C</mi><mrow><mi>v</mi><mi>e</mi><mi>d</mi><mi>l</mi><mi>i</mi><mi>k</mi><mi>e</mi><mi>h</mi><mi>o</mi><mi>l</mi><mi>d</mi></mrow></msub>
<mo>)</mo>`;

// Terrain distance (Haversine)
const TERRAIN = `
<msub><mi>d</mi><mi>g</mi></msub><mo>=</mo>
<mn>2</mn><msub><mi>R</mi><mi>E</mi></msub><mo>&#x22C5;</mo>
<mi>arcsin</mi><mo>&#x2061;</mo>
<mrow>
  <mo>(</mo>
  <msqrt>
    <msup><mi>sin</mi><mn>2</mn></msup><mo>&#x2061;</mo>
    <mrow><mo>(</mo><mfrac><mrow><mi>&#x394;</mi><mi>&#x03D5;</mi></mrow><mn>2</mn></mfrac><mo>)</mo></mrow>
    <mo>+</mo>
    <mi>cos</mi><mo>&#x2061;</mo><mo>(</mo><msub><mi>&#x03D5;</mi><mi>A</mi></msub><mo>)</mo>
    <mi>cos</mi><mo>&#x2061;</mo><mo>(</mo><msub><mi>&#x03D5;</mi><mi>B</mi></msub><mo>)</mo>
    <msup><mi>sin</mi><mn>2</mn></msup><mo>&#x2061;</mo>
    <mrow><mo>(</mo><mfrac><mrow><mi>&#x394;</mi><mi>&#x03BB;</mi></mrow><mn>2</mn></mfrac><mo>)</mo></mrow>
  </msqrt>
  <mo>)</mo>
</mrow>`;

// Fresnel & free-space loss
const FRESNEL = `
<msub><mi>F</mi><mn>1</mn></msub><mo>=</mo>
<msqrt>
  <mfrac>
    <mrow><mi>&#x03BB;</mi><msub><mi>d</mi><mn>1</mn></msub><msub><mi>d</mi><mn>2</mn></msub></mrow>
    <mrow><msub><mi>d</mi><mn>1</mn></msub><mo>+</mo><msub><mi>d</mi><mn>2</mn></msub></mrow>
  </mfrac>
</msqrt>
<mo>&#x22C5;</mo><msub><mi>k</mi><mi>F</mi></msub>
<mo>,</mo><mspace width="2em"/>
<msub><mi>L</mi><mrow><mi>f</mi><mi>s</mi></mrow></msub><mo>=</mo>
<mn>20</mn><msub><mi>log</mi><mrow><mn>1</mn><mn>0</mn></mrow></msub><mo>&#x2061;</mo>
<mrow><mo>(</mo><mfrac><mrow><mn>4</mn><mi>&#x03C0;</mi><msub><mi>d</mi><mi>g</mi></msub></mrow><mi>&#x03BB;</mi></mfrac><mo>)</mo></mrow>`;

// Earth curvature & clearance
const CURVATURE = `
<msub><mi>R</mi><mrow><mi>e</mi><mi>f</mi><mi>f</mi></mrow></msub><mo>=</mo>
<mi>k</mi><mo>&#x22C5;</mo><msub><mi>R</mi><mi>E</mi></msub>
<mo>,</mo><mspace width="2em"/>
<msub><mi>K</mi><mrow><mi>L</mi><mi>O</mi><mi>S</mi></mrow></msub><mo>=</mo>
<munder><mo movablelimits="true">min</mo><mi>x</mi></munder>
<mo>(</mo>
<msub><mi>h</mi><mrow><mi>L</mi><mi>O</mi><mi>S</mi></mrow></msub><mo>(</mo><mi>x</mi><mo>)</mo>
<mo>&#x2212;</mo>
<mo>(</mo><msub><mi>h</mi><mrow><mi>t</mi><mi>e</mi><mi>r</mi><mi>r</mi></mrow></msub><mo>(</mo><mi>x</mi><mo>)</mo>
<mo>+</mo><msub><mi>h</mi><mi>E</mi></msub><mo>(</mo><mi>x</mi><mo>)</mo><mo>)</mo>
<mo>)</mo>`;

// Rain attenuation
const RAIN = `
<msub><mi>A</mi><mi>r</mi></msub><mo>=</mo>
<msub><mi>&#x03B3;</mi><mi>R</mi></msub><mo>&#x22C5;</mo><mi>r</mi><mo>&#x22C5;</mo><mi>d</mi>
<mo>,</mo><mspace width="2em"/>
<msub><mi>&#x03B3;</mi><mi>R</mi></msub><mo>=</mo>
<msub><mi>k</mi><mi>R</mi></msub><mo>&#x22C5;</mo>
<msup><mi>R</mi><mi>&#x03B1;</mi></msup>`;

// ── Inline symbol helpers (MathML fragments without <math> wrapper) ──
const sym = (s: string) => `<mi>${s}</mi>`;
const sub = (base: string, subscript: string) =>
  `<msub><mi>${base}</mi><mrow>${subscript.split("").map(c => `<mi>${c}</mi>`).join("")}</mrow></msub>`;

const I = sym("I");
const P = sym("P");
const t = sym("t");
const F = sym("F");
const k = sym("k");
const d = sym("d");
const r = sym("r");
const R = sym("R");
const V_nom = sub("V", "nom");
const E_dag = sub("E", "dag");
const Q_dag = sub("Q", "dag");
const E_sol = sub("E", "sol");
const E_forbruk = sub("E", "forbruk");
const E_underskudd = sub("E", "underskudd");
const E_bal = sub("E", "bal");
const t_drift = sub("t", "drift");
const t_tot = sub("t", "tot");
const P_sek = sub("P", "sek");
const r_forbruk = sub("r", "forbruk");
const C_drivstoff = sub("C", "drivstoff");
const p_drivstoff = sub("p", "drivstoff");
const C_batt = sub("C", "batt");
const n_autonomi = sub("n", "autonomi");
const G = sym("G");
const P_panel = sub("P", "panel");
const n_panel = sub("n", "panel");
const eta_system = `<msub><mi>&#x03B7;</mi><mrow><mi>s</mi><mi>y</mi><mi>s</mi><mi>t</mi><mi>e</mi><mi>m</mi></mrow></msub>`;
const n_dager = sub("n", "dager");
const DoD = `<mi>D</mi><mi>o</mi><mi>D</mi>`;
const TOC_sym = `<mi>T</mi><mi>O</mi><mi>C</mi>`;
const C_innkjop = `<msub><mi>C</mi><mrow><mi>i</mi><mi>n</mi><mi>n</mi><mi>k</mi><mi>j</mi><mi>&#xF8;</mi><mi>p</mi></mrow></msub>`;
const H = sym("H");
const C_vedlikehold = sub("C", "vedlikehold");
const d_g = `<msub><mi>d</mi><mi>g</mi></msub>`;
const R_E = `<msub><mi>R</mi><mi>E</mi></msub>`;
const phi_AB = `<msub><mi>&#x03D5;</mi><mi>A</mi></msub><mo>,</mo><msub><mi>&#x03D5;</mi><mi>B</mi></msub>`;
const delta_phi = `<mi>&#x394;</mi><mi>&#x03D5;</mi>`;
const delta_lambda = `<mi>&#x394;</mi><mi>&#x03BB;</mi>`;
const F1 = `<msub><mi>F</mi><mn>1</mn></msub>`;
const lambda = `<mi>&#x03BB;</mi>`;
const d1d2 = `<msub><mi>d</mi><mn>1</mn></msub><mo>,</mo><msub><mi>d</mi><mn>2</mn></msub>`;
const k_F = `<msub><mi>k</mi><mi>F</mi></msub>`;
const L_fs = `<msub><mi>L</mi><mrow><mi>f</mi><mi>s</mi></mrow></msub>`;
const R_eff = `<msub><mi>R</mi><mrow><mi>e</mi><mi>f</mi><mi>f</mi></mrow></msub>`;
const K_LOS = `<msub><mi>K</mi><mrow><mi>L</mi><mi>O</mi><mi>S</mi></mrow></msub>`;
const K_F = `<msub><mi>K</mi><mi>F</mi></msub>`;
const h_E = `<msub><mi>h</mi><mi>E</mi></msub><mo>(</mo><mi>x</mi><mo>)</mo>`;
const A_r = `<msub><mi>A</mi><mi>r</mi></msub>`;
const gamma_R = `<msub><mi>&#x03B3;</mi><mi>R</mi></msub>`;
const k_R_alpha = `<msub><mi>k</mi><mi>R</mi></msub><mo>,</mo><mi>&#x03B1;</mi>`;

export function DokumentasjonPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="w-7 h-7 text-hydro-600" />
        <h1 className="text-2xl font-bold text-hydro-900">Dokumentasjon</h1>
      </div>

      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        <Section title="Effektbudsjett">
          <Article
            title="Effekt, straumtrekk og dagleg forbruk"
            description="Straumtrekk, dagleg forbruk og dagleg straumtrekk er rekna ut frå effekt, nominell spenning og timar per dag."
            formula={POWER_BUDGET}
            vars={[
              [I, "straumtrekk"],
              [P, "effekt"],
              [V_nom, "nominell spenning"],
              [E_dag, "dagleg forbruk"],
              [Q_dag, "dagleg straumtrekk"],
              [t, "timar per dag"],
            ]}
          />
        </Section>

        <Section title="Energibalanse">
          <Article
            title="Solproduksjon"
            description="Solproduksjon er rekna ut frå solinnstråling, paneleffekt, tal panel og systemverknadsgrad."
            formula={SOLAR}
            vars={[
              [E_sol, "solproduksjon"],
              [G, "solinnstråling for vald periode"],
              [P_panel, "paneleffekt"],
              [n_panel, "tal panel"],
              [eta_system, "systemverknadsgrad"],
            ]}
          />
          <Article
            title="Energiforbruk og energiunderskot"
            description="Totalt energiforbruk og energiunderskot er rekna ut frå dagleg forbruk, tal dagar og solproduksjon."
            formula={CONSUMPTION}
            vars={[
              [E_forbruk, "totalt energiforbruk"],
              [E_dag, "dagleg forbruk"],
              [n_dager, "tal dagar"],
              [E_underskudd, "energiunderskot"],
              [E_sol, "solproduksjon"],
            ]}
          />
          <Article
            title="Energibalanse"
            description="Energibalansen er rekna som skilnaden mellom solproduksjon og energiforbruk."
            formula={BALANCE}
            vars={[
              [E_bal, "energibalanse"],
              [E_sol, "solproduksjon"],
              [E_forbruk, "totalt energiforbruk"],
            ]}
          />
          <Article
            title="Driftstimar"
            description="Driftstimar og totale driftstimar er rekna som grunnlag for reservedrift."
            formula={RUNTIME}
            vars={[
              [t_drift, "driftstimar"],
              [t_tot, "totale driftstimar"],
              [E_underskudd, "energiunderskot"],
              [P_sek, "effekt sekundærkjelde"],
            ]}
          />
          <Article
            title="Drivstofforbruk og drivstoffkostnadar"
            description="Drivstofforbruk og drivstoffkostnadar er rekna ut frå energiunderskotet, forbruksrate og drivstoffpris."
            formula={FUEL}
            vars={[
              [F, "drivstofforbruk"],
              [E_underskudd, "energiunderskot"],
              [t_drift, "driftstimar"],
              [P_sek, "effekt sekundærkjelde"],
              [r_forbruk, "forbruksrate"],
              [C_drivstoff, "drivstoffkostnadar"],
              [p_drivstoff, "drivstoffpris"],
            ]}
          />
        </Section>

        <Section title="Batteri">
          <Article
            title="Batterikapasitet"
            description="Batterikapasitet er rekna ut frå dagleg forbruk, autonomidagar, nominell spenning og tillaten utladingsdjupn."
            formula={BATTERY}
            vars={[
              [C_batt, "batterikapasitet"],
              [E_dag, "dagleg forbruk"],
              [n_autonomi, "tal autonomidagar"],
              [V_nom, "nominell spenning"],
              [DoD, "tillaten utladingsdjupn"],
            ]}
          />
        </Section>

        <Section title="TOC">
          <Article
            title="TOC"
            description="Totale eigarkostnadar er rekna ut frå innkjøpskostnad, årlege driftskostnadar og vedlikehald over vurderingshorisonten."
            formula={TCO}
            vars={[
              [TOC_sym, "totale eigarkostnadar"],
              [C_innkjop, "innkjøpskostnad"],
              [H, "vurderingshorisont i år"],
              [C_drivstoff, "drivstoffkostnadar per år"],
              [C_vedlikehold, "vedlikehaldskostnad per år"],
            ]}
          />
        </Section>

        <Section title="Radiolenkje">
          <p className="text-sm text-hydro-700 -mt-4 mb-4">
            Radiolenkjesida nyttar standardformlar for terrengavstand, jordkrumming, Fresnel-sone, friromstap og regndemping i siktlinjevurderinga.
          </p>
          <Article
            title="Terrengavstand"
            description="Avstanden mellom to koordinatpunkt er estimert frå jordradius og koordinatskilnadar."
            formula={TERRAIN}
            vars={[
              [d_g, "terrengavstand mellom punkt A og punkt B"],
              [R_E, "jordradius"],
              [phi_AB, "breiddegrad for punkt A og punkt B"],
              [delta_phi, "skilnad i breiddegrad"],
              [delta_lambda, "skilnad i lengdegrad"],
            ]}
          />
          <Article
            title="Fresnel-klaring og friromstap"
            description="HydroGuide kombinerer Fresnel-sone og friromstap som del av radiolenkjeoversikta."
            formula={FRESNEL}
            vars={[
              [F1, "radius til den fyrste Fresnel-sona"],
              [lambda, "bølgjelengd i luft"],
              [d1d2, "avstand frå hindringspunktet til kvar ende av lenkja"],
              [k_F, "vald Fresnel-faktor"],
              [L_fs, "friromstap"],
            ]}
          />
          <Article
            title="Jordkrumming og klaring"
            description="Terrengprofilen er korrigert med effektiv jordradius før HydroGuide finn minimumsklaringa for siktlinje og Fresnel-sone."
            formula={CURVATURE}
            vars={[
              [R_eff, "effektiv jordradius nytta i profilen"],
              [k, "vald k-faktor"],
              [K_LOS, "minimumsklaring mellom siktlinje og korrigert terreng"],
              [K_F, "minimumsklaring mellom nedre Fresnel-grense og korrigert terreng"],
              [h_E, "jordkrummingskorreksjon langs profilen"],
            ]}
          />
          <Article
            title="Regndemping"
            description="Regndemping er rekna ut frå spesifikk demping per kilometer og ein reduksjonsfaktor som avheng av lengd, frekvens, polarisasjon og regnrate."
            formula={RAIN}
            vars={[
              [A_r, "total regndemping i dB"],
              [gamma_R, "spesifikk regndemping i dB/km"],
              [r, "reduksjonsfaktor for effektiv regnlengd"],
              [d, "lenkjelengd i km"],
              [R, "regnrate/regnfaktor"],
              [k_R_alpha, "frekvens- og polarisasjonsavhengige parameter interpolert frå tabell"],
            ]}
          />
        </Section>
      </motion.div>
    </div>
  );
}
