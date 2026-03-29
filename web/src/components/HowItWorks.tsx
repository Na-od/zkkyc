import { Key, Upload, ShieldCheck, UserCheck, ArrowDown } from "lucide-react";
import AnimateIn from "@/components/AnimateIn";

const steps = [
  {
    icon: <Key className="h-5 w-5" />,
    title: "Generate Master Identity",
    desc: "Create a secret key and public commitment locally. Your master credential never leaves your device.",
    detail: "sk ← random(), pk = Com(sk)",
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Register on IdR",
    desc: "Publish your public commitment to the Soroban identity registry. This forms the anonymity set.",
    detail: "IdR.register(pk) → Stellar Testnet",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Generate ZK Proof",
    desc: "Prove you own one of the identities in the anonymity set, without revealing which one. A unique nullifier prevents double-registration.",
    detail: "π = Prove(sk, SP_id, AnonymitySet)",
  },
  {
    icon: <UserCheck className="h-5 w-5" />,
    title: "Register Pseudonym with SP",
    desc: "The service provider verifies your proof off-chain, checks the nullifier, and accepts your pseudonym.",
    detail: "SP.register(pseudonym, nullifier, π)",
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="relative py-24 lg:py-32">
    <div className="container mx-auto px-6">
      <AnimateIn className="text-center mb-16">
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">
          Protocol
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          How U2SSO works
        </h2>
        <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-pretty">
          Four steps from master identity to unlinkable pseudonym — no trusted
          identity provider required.
        </p>
      </AnimateIn>

      <div className="relative max-w-2xl mx-auto">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-2">
          {steps.map((step, i) => (
            <AnimateIn key={i} delay={i * 120}>
              <div className="relative pl-16 pb-10 group">
                {/* Node */}
                <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-primary group-hover:border-primary/40 group-hover:shadow-[0_0_16px_-4px_hsl(var(--glow)/0.2)] transition-all duration-300">
                  {step.icon}
                </div>

                {/* Content */}
                <div className="pt-1">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
                    {step.desc}
                  </p>
                  <code className="mt-2 inline-block text-xs text-primary/70 font-mono bg-primary/5 px-2 py-1 rounded">
                    {step.detail}
                  </code>
                </div>

                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[22px] bottom-0 text-muted-foreground/40">
                    <ArrowDown className="h-3 w-3" />
                  </div>
                )}
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorks;
