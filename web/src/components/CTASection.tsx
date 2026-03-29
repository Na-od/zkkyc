import Link from "next/link";
import { Button } from "@/components/ui/button";
import AnimateIn from "@/components/AnimateIn";

const CTASection = () => (
  <section id="platform" className="relative py-24 lg:py-32 overflow-hidden border-t border-border/50">
    <div className="absolute inset-0 grid-pattern opacity-10" />
    <div className="container relative mx-auto px-6 text-center max-w-2xl">
      <AnimateIn>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
          Ready to take back control?
        </h2>
        <p className="text-muted-foreground mb-10 text-pretty leading-relaxed">
          Create your decentralized identity today, or see how it works from the
          perspective of a Service Provider. No data trails, no tracking.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" asChild>
            <Link href="/register">
              Create Identity
            </Link>
          </Button>
          <Button variant="hero-outline" size="lg" asChild>
            <Link href="/sp">
              SP Portal
            </Link>
          </Button>
        </div>
      </AnimateIn>
    </div>
  </section>
);

export default CTASection;
