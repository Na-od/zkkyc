'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Redesign Imports
import { Button } from "@/components/ui/button";
import { 
  Landmark, 
  Lock, 
  User, 
  Loader2, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle,
  Building2,
  Smartphone
} from "lucide-react";
import AnimateIn from "@/components/AnimateIn";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      sessionStorage.setItem('zkkyc_admin_token', data.token);
      router.push('/admin');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <section className="min-h-screen flex items-center pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-md">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>

        <AnimateIn>
          <div className="rounded-xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl" />
            
            <div className="text-center mb-8 relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto mb-4 font-black text-2xl text-amber-500">
                <Landmark size={24} />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Issuer Administration</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Restricted access for authorized identity issuers.
              </p>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Admin Username
                  </label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin_user"
                      className="w-full rounded-md border border-input bg-secondary/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Secure Password
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && username && password && handleLogin()}
                      placeholder="••••••••"
                      className="w-full rounded-md border border-input bg-secondary/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in zoom-in-95">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <Button 
                className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/10" 
                onClick={handleLogin}
                disabled={loading || !username || !password}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Authorize Access
              </Button>

              {/* Other Portals */}
              <div className="pt-6 border-t border-border">
                <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                  Other Portals
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm" className="h-11 gap-2 text-xs border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500" asChild>
                    <Link href="/login">
                      <Smartphone className="h-3.5 w-3.5" />
                      User Portal
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="h-11 gap-2 text-xs border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500" asChild>
                    <Link href="/sp">
                      <Building2 className="h-3.5 w-3.5" />
                      Service Provider
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>

        <p className="text-center mt-8 text-xs text-muted-foreground">
          Authorized Personnel Only • zkKYC Compliance System
        </p>
      </div>
    </section>
  );
}
