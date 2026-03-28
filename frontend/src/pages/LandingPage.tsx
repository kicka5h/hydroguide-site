import { lazy, Suspense } from "react";
import { HeroSection } from "@/components/landing/HeroSection";

const FeaturesGrid = lazy(() =>
  import("@/components/landing/FeaturesGrid").then((m) => ({ default: m.FeaturesGrid }))
);
const HowItWorks = lazy(() =>
  import("@/components/landing/HowItWorks").then((m) => ({ default: m.HowItWorks }))
);
const TeamSection = lazy(() =>
  import("@/components/landing/TeamSection").then((m) => ({ default: m.TeamSection }))
);
const Footer = lazy(() =>
  import("@/components/landing/Footer").then((m) => ({ default: m.Footer }))
);

export function LandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <Suspense>
        <FeaturesGrid />
        <HowItWorks />
        <TeamSection />
        <Footer />
      </Suspense>
    </main>
  );
}
