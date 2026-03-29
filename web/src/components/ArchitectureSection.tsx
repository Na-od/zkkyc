import { Database, Globe, Terminal, Shield, ArrowRight } from "lucide-react";
import AnimateIn from "@/components/AnimateIn";

const components = [
  {
    icon: <Database className="h-5 w-5" />,
    title: "Soroban IdR Contract",
    tag: "On-chain",
    desc: "Rust/Wasm smart contract on Stellar testnet storing master identity commitments. Provides anonymity set read APIs.",
    tech: ["Rust", "soroban-sdk", "Wasm"],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "ZK / Crypto Layer",
    tag: "Off-chain",
    desc: "Circom circuits with snarkjs (Groth16) for proof generation. Verification happens on the SP backend — not on-chain.",
    tech: ["Circom", "snarkjs", "Groth16"],
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: "CLI Tool",
    tag: "Client",
    desc: "Command-line interface for identity management: create master credentials, register on-chain, generate proofs and pseudonyms.",
    tech: ["Rust", "Soroban RPC", "HKDF"],
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "SP Web App",
    tag: "Frontend",
    desc: "Service provider portal for pseudonym registration and login. Verifies proofs and checks anonymity-set membership via IdR.",
    tech: ["React", "TypeScript", "Stellar SDK"],
  },
];

const ArchitectureSection = () => (
  <section id="architecture" className="relative py-24 lg:py-32 border-t border-border/50">
    <div className="container mx-auto px-6">
      <AnimateIn className="text-center mb-16">
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">
          System Design
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          Architecture
        </h2>
        <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-pretty">
          Four components working together — on-chain registry, off-chain
          proofs, CLI tooling, and the SP web interface.
        </p>
      </AnimateIn>

      <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {components.map((c, i) => (
          <AnimateIn key={i} delay={i * 100}>
            <div className="group rounded-lg border border-border bg-card p-6 hover:border-primary/30 hover:shadow-[0_0_24px_-8px_hsl(var(--glow)/0.15)] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                  {c.icon}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded px-2 py-0.5">
                  {c.tag}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-pretty mb-4">
                {c.desc}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.tech.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-mono text-primary/80 bg-primary/5 border border-primary/10 rounded px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>

      {/* Flow diagram */}
      <AnimateIn delay={500} className="mt-16 max-w-3xl mx-auto">
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
            Registration Flow
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap text-sm">
            <FlowNode label="User" sub="master key" />
            <ArrowRight className="h-4 w-4 text-primary/50 shrink-0" />
            <FlowNode label="IdR" sub="commitment" />
            <ArrowRight className="h-4 w-4 text-primary/50 shrink-0" />
            <FlowNode label="ZK Prove" sub="π + nullifier" />
            <ArrowRight className="h-4 w-4 text-primary/50 shrink-0" />
            <FlowNode label="SP" sub="pseudonym" />
          </div>
        </div>
      </AnimateIn>
    </div>
  </section>
);

const FlowNode = ({ label, sub }: { label: string; sub: string }) => (
  <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-md border border-border bg-secondary/50 min-w-[90px]">
    <span className="text-sm font-medium text-foreground">{label}</span>
    <span className="text-[10px] font-mono text-muted-foreground">{sub}</span>
  </div>
);

export default ArchitectureSection;
