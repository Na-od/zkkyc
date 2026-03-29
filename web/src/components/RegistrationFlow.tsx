'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import AnimateIn from "@/components/AnimateIn";

type Step = "challenge" | "proving" | "verified" | "registered";

const RegistrationFlow = ({ onNavigate }: { onNavigate: (view: string) => void }) => {
  const [step, setStep] = useState<Step>("challenge");
  const [copied, setCopied] = useState(false);

  // Cryptographic parameters
  const challenge = "0x8a4f2e…d917c3b5";
  const pseudonym = "0xpseudo_" + Math.random().toString(36).slice(2, 10);
  const nullifier = "0xnul_" + Math.random().toString(36).slice(2, 14);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const advance = () => {
    if (step === "challenge") {
      setStep("proving");
      setTimeout(() => setStep("verified"), 2200);
    } else if (step === "verified") {
      setStep("registered");
    }
  };

  return (
    <section className="min-h-screen flex items-center pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-lg">
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <AnimateIn>
          <div className="rounded-xl border border-border bg-card p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Register Pseudonym
                </h2>
                <p className="text-xs text-muted-foreground">
                  Service Provider: acme.io
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="flex gap-1 mb-8">
              {(["challenge", "proving", "verified", "registered"] as Step[]).map(
                (s, i) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                      (["challenge", "proving", "verified", "registered"].indexOf(step) >= i)
                        ? "bg-primary"
                        : "bg-border"
                    }`}
                  />
                )
              )}
            </div>

            {/* Step content */}
            {step === "challenge" && (
              <div className="space-y-4 animate-fade-up">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Challenge from SP
                  </label>
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-4 py-3 font-mono text-sm text-foreground">
                    <span className="truncate">{challenge}</span>
                    <button
                      onClick={() => handleCopy(challenge)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Anonymity Set
                  </label>
                  <div className="mt-2 rounded-md border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">247</span> identities
                    in current set • Batch #14
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-pretty">
                  Your CLI will generate a Groth16 proof showing you own one of the
                  247 master identities — without revealing which one.
                </p>

                <Button className="w-full" onClick={advance}>
                  Generate Proof
                </Button>
              </div>
            )}

            {step === "proving" && (
              <div className="space-y-6 py-8 text-center animate-fade-up">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Generating Groth16 proof…
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Computing witness • Building R1CS • Creating π
                  </p>
                </div>
                <div className="font-mono text-xs text-muted-foreground space-y-1">
                  <p>constraints: 14,832</p>
                  <p>witness size: 2,417</p>
                </div>
              </div>
            )}

            {step === "verified" && (
              <div className="space-y-4 animate-fade-up">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Proof verified</span>
                </div>

                <div className="space-y-3">
                  <DataRow label="Pseudonym" value={pseudonym} mono />
                  <DataRow label="Nullifier" value={nullifier} mono />
                  <DataRow label="Proof size" value="4,128 bytes" />
                  <DataRow label="Verification" value="2.3 ms" />
                </div>

                <p className="text-xs text-muted-foreground text-pretty">
                  The nullifier is unique to your master identity + this SP.
                  Attempting a second registration would produce the same nullifier
                  and be rejected.
                </p>

                <Button className="w-full" onClick={advance}>
                  Complete Registration
                </Button>
              </div>
            )}

            {step === "registered" && (
              <div className="space-y-4 animate-fade-up text-center py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Pseudonym registered
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can now log in to acme.io using your pseudonym.
                  </p>
                </div>
                <div className="rounded-md border border-border bg-secondary/50 px-4 py-3 font-mono text-xs text-primary text-left break-all">
                  {pseudonym}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => onNavigate("home")}>
                    Home
                  </Button>
                  <Button className="flex-1" onClick={() => onNavigate("login")}>
                    Login
                  </Button>
                </div>
              </div>
            )}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
};

const DataRow = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0">
    <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">
      {label}
    </span>
    <span
      className={`text-sm text-foreground truncate ${mono ? "font-mono" : ""}`}
    >
      {value}
    </span>
  </div>
);

export default RegistrationFlow;
