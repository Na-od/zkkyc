'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadKeyFromStorage, computeMasterIdentity, decryptFromBackup, hashPhone, saveKeyToStorage } from '@/lib/masterKey';

// Redesign Imports
import { Button } from "@/components/ui/button";
import { Shield, Key, Smartphone, Loader2, ArrowLeft, Cloud, AlertCircle, Building2, Landmark } from "lucide-react";
import AnimateIn from "@/components/AnimateIn";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [cloudBackup, setCloudBackup] = useState<any>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setShowRestorePrompt(false);

    try {
      const userKey = `zkkyc_master_${phone}`;
      const stored = localStorage.getItem(userKey);

      if (!stored) {
        const hp = await hashPhone(phone);
        const res = await fetch(`/api/identity/backup?phoneHash=${hp}`);
        const data = await res.json();

        if (data.found) {
          setCloudBackup(data.backup);
          setShowRestorePrompt(true);
          setLoading(false);
          return;
        } else {
          throw new Error('No identity found for this phone number locally or on the cloud.');
        }
      }

      const keys = await loadKeyFromStorage(password, phone);
      const phi = await computeMasterIdentity(keys.sk, keys.r, keys.birthYear, keys.countryCode);

      // Store session data
      sessionStorage.setItem('zkkyc_phi', phi);
      sessionStorage.setItem('zkkyc_phone', phone);
      sessionStorage.setItem('zkkyc_session', Date.now().toString());
      localStorage.setItem('zkkyc_phone', phone); // Needed by dashboard backup feature

      // Restore wallet address from Supabase
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: identity } = await supabase
          .from('identities')
          .select('wallet_address')
          .eq('commitment', phi)
          .maybeSingle();
        if (identity?.wallet_address) {
          sessionStorage.setItem('zkkyc_address', identity.wallet_address);
        }
      } catch (_) {}

      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message === 'Key mismatch' ? 'Incorrect master password' : e.message);
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!cloudBackup) return;

      const material = await decryptFromBackup(
        password,
        cloudBackup.encrypted_data,
        cloudBackup.iv,
        cloudBackup.salt
      );

      await saveKeyToStorage(
        material.sk,
        material.r,
        password,
        phone,
        material.birthYear,
        material.countryCode
      );

      const phi = await computeMasterIdentity(material.sk, material.r, material.birthYear, material.countryCode);

      // Store session data (sessionStorage for auth, localStorage for backup feature)
      sessionStorage.setItem('zkkyc_phi', phi);
      sessionStorage.setItem('zkkyc_phone', phone);
      sessionStorage.setItem('zkkyc_session', Date.now().toString());
      localStorage.setItem('zkkyc_phone', phone);

      // Restore wallet address from Supabase
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: identity } = await supabase
          .from('identities')
          .select('wallet_address')
          .eq('commitment', phi)
          .maybeSingle();
        if (identity?.wallet_address) {
          sessionStorage.setItem('zkkyc_address', identity.wallet_address);
        }
      } catch (_) {}

      router.push('/dashboard');
    } catch (e: any) {
      setError('Decryption failed. Please check your Master Password.');
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
          <div className="rounded-xl border border-border bg-card p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-4 font-black text-2xl text-primary">
                Z
              </div>
              <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Unlock your identity with your master password.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Phone Number
                  </label>
                  <div className="relative mt-2">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 ..."
                      className="w-full rounded-md border border-input bg-secondary/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Master Password
                  </label>
                  <div className="relative mt-2">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && phone && password && handleLogin()}
                      placeholder="Enter your master password"
                      className="w-full rounded-md border border-input bg-secondary/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in zoom-in-95 duration-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {showRestorePrompt ? (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase">
                      <Cloud className="h-3.5 w-3.5" />
                      Cloud Backup Found
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Your identity was found in our encrypted backups. Unlock it with your Master Password to restore access to this device.
                    </p>
                  </div>
                  <Button
                    className="w-full h-12"
                    onClick={handleRestore}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
                    Restore & Unlink
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-xs h-8"
                    onClick={() => setShowRestorePrompt(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleLogin}
                  disabled={loading || !password || !phone}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                  {loading ? 'Unlocking...' : 'Unlock Identity'}
                </Button>
              )}

              {/* Other Portals */}
              <div className="pt-6 border-t border-border">
                <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                  Organization Access
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 gap-2 text-xs border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400"
                    asChild
                  >
                    <Link href="/sp">
                      <Building2 className="h-3.5 w-3.5" />
                      Service Provider
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 gap-2 text-xs border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 hover:text-amber-400"
                    asChild
                  >
                    <Link href="/admin/login">
                      <Landmark className="h-3.5 w-3.5" />
                      Issuer Admin
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              New to zkKYC?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline transition-all">
                Create an identity
              </Link>
            </p>
          </div>
        </AnimateIn>

        <p className="text-center mt-8 text-xs text-muted-foreground">
          Zero-Knowledge Identity Management • Powered by Stellar
        </p>
      </div>
    </section>
  );
}
