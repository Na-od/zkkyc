import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import HowItWorks from "@/components/HowItWorks";
import ArchitectureSection from "@/components/ArchitectureSection";
import CTASection from "@/components/CTASection";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <ArchitectureSection />
      <CTASection />
    </div>
  );
}
