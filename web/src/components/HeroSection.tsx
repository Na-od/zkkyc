'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, ArrowRight, Lock, Eye, Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 grid-pattern opacity-40" />
      
      {/* Radial fade */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_70%)]" />

      <div className="container relative mx-auto px-6 pt-24 pb-16">
        <div className="max-w-3xl space-y-8">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary opacity-0 animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Built on Stellar Soroban
          </div>

          {/* Heading */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-balance opacity-0 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            Anonymous credentials
            <br />
            <span className="text-gradient">without trust.</span>
          </h1>

          {/* Sub */}
          <p
            className="text-lg text-muted-foreground max-w-xl text-pretty leading-relaxed opacity-0 animate-fade-up"
            style={{ animationDelay: "350ms" }}
          >
            Self-issue a master identity. Prove membership in zero knowledge.
            Register unique pseudonyms per service — unlinkable, Sybil-resistant,
            no identity provider needed.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap gap-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "500ms" }}
          >
            <Button variant="hero" size="lg" asChild>
              <Link href="/register">
                Register Pseudonym
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link href="/#how-it-works">
                How it works
              </Link>
            </Button>
          </div>

          {/* Stats row */}
          <div
            className="flex flex-wrap gap-8 pt-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "650ms" }}
          >
            <Stat icon={<Lock className="h-3.5 w-3.5" />} label="ZK Proofs" value="Groth16" />
            <Stat icon={<Eye className="h-3.5 w-3.5" />} label="Unlinkable" value="Multi-SP" />
            <Stat icon={<Fingerprint className="h-3.5 w-3.5" />} label="Sybil Resistant" value="Nullifiers" />
          </div>
        </div>

        {/* Floating terminal card */}
        <div
          className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-[380px] opacity-0 animate-fade-up"
          style={{ animationDelay: "700ms" }}
        >
          <TerminalCard />
        </div>
      </div>
    </section>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-primary">
      {icon}
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

const TerminalCard = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  const lines = [
    { prefix: "$", text: "zkcred generate-master" },
    { prefix: "✓", text: "Master identity created", color: "text-primary" },
    { prefix: "$", text: "zkcred register --idr stellar" },
    { prefix: "✓", text: "Commitment published to IdR", color: "text-primary" },
    { prefix: "$", text: "zkcred prove --sp acme.io" },
    { prefix: "⟐", text: "Generating Groth16 proof...", color: "text-muted-foreground" },
    { prefix: "✓", text: "Pseudonym + nullifier ready", color: "text-primary" },
    { prefix: " ", text: "nul: 0x7a3f...c812", color: "text-muted-foreground font-mono text-xs" },
  ];

  useEffect(() => {
    if (visibleLines < lines.length) {
      const timer = setTimeout(() => setVisibleLines((v) => v + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, lines.length]);

  return (
    <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--warning))]/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">zkcred-cli</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-1.5 font-mono text-[13px] min-h-[220px]">
        {lines.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            className={`flex gap-2 opacity-0 animate-fade-up`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className={line.color || "text-muted-foreground"}>{line.prefix}</span>
            <span className={line.color || "text-foreground"}>{line.text}</span>
          </div>
        ))}
        {visibleLines < lines.length && (
          <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default HeroSection;
