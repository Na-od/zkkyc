'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogIn, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import AnimateIn from "@/components/AnimateIn";

type LoginStep = "input" | "verifying" | "success" | "rejected";

const LoginFlow = ({ onNavigate }: { onNavigate: (view: string) => void }) => {
  const [step, setStep] = useState<LoginStep>("input");
  const [pseudonym, setPseudonym] = useState("");

  const handleLogin = () => {
    if (!pseudonym.trim()) return;
    setStep("verifying");
    setTimeout(() => {
      // Simulate — accept if starts with "0x"
      setStep(pseudonym.startsWith("0x") ? "success" : "rejected");
    }, 1800);
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
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <LogIn className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Login</h2>
                <p className="text-xs text-muted-foreground">
                  Authenticate with your pseudonym
                </p>
              </div>
            </div>

            {step === "input" && (
              <div className="space-y-4 animate-fade-up">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pseudonym
                  </label>
                  <input
                    type="text"
                    value={pseudonym}
                    onChange={(e) => setPseudonym(e.target.value)}
                    placeholder="0xpseudo_..."
                    className="mt-2 w-full rounded-md border border-input bg-secondary/50 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>

                <p className="text-xs text-muted-foreground text-pretty">
                  Enter the pseudonym you registered with this service provider.
                  Your identity remains unlinkable to your master credential.
                </p>

                <Button className="w-full" onClick={handleLogin} disabled={!pseudonym.trim()}>
                  Authenticate
                </Button>

                <p className="text-center">
                  <button
                    onClick={() => onNavigate("register")}
                    className="text-xs text-primary hover:underline"
                  >
                    Don't have a pseudonym? Register one
                  </button>
                </p>
              </div>
            )}

            {step === "verifying" && (
              <div className="space-y-4 py-8 text-center animate-fade-up">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Verifying pseudonym…
                </p>
              </div>
            )}

            {step === "success" && (
              <div className="space-y-4 py-4 text-center animate-fade-up">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Authenticated
                </h3>
                <p className="text-sm text-muted-foreground">
                  Welcome back. Your session is active.
                </p>
                <div className="rounded-md border border-border bg-secondary/50 px-4 py-3 font-mono text-xs text-primary break-all">
                  {pseudonym}
                </div>
                <Button variant="outline" className="w-full" onClick={() => onNavigate("home")}>
                  Go to Dashboard
                </Button>
              </div>
            )}

            {step === "rejected" && (
              <div className="space-y-4 py-4 text-center animate-fade-up">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 mx-auto">
                  <ShieldAlert className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Pseudonym not found
                </h3>
                <p className="text-sm text-muted-foreground">
                  No registration exists for this pseudonym on this SP.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("input")}>
                    Try again
                  </Button>
                  <Button className="flex-1" onClick={() => onNavigate("register")}>
                    Register
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

export default LoginFlow;
