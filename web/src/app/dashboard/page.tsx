'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { loadKeyFromStorage, computeMasterIdentity, encryptForBackup, hashPhone } from '@/lib/masterKey';

// Redesign Imports
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  CreditCard, 
  Cloud, 
  RefreshCw, 
  LogOut, 
  UserPlus, 
  LayoutDashboard, 
  Building2, 
  ExternalLink, 
  Download, 
  Lock, 
  Unlock,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Smartphone,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import AnimateIn from "@/components/AnimateIn";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [phi, setPhi] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [anonymitySetSize, setAnonymitySetSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<string>('unknown');
  const [backupStatus, setBackupStatus] = useState<'none' | 'exists' | 'syncing' | 'error'>('none');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const init = async () => {
      const session = sessionStorage.getItem('zkkyc_session');
      const activePhone = sessionStorage.getItem('zkkyc_phone');
      
      if (!session || !activePhone) {
        router.push('/login');
        return;
      }

      // Session expiry check (24 hours)
      const sessionAge = Date.now() - parseInt(session);
      const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
      if (sessionAge > SESSION_TTL) {
        sessionStorage.removeItem('zkkyc_session');
        sessionStorage.removeItem('zkkyc_phi');
        sessionStorage.removeItem('zkkyc_phone');
        sessionStorage.removeItem('zkkyc_address');
        router.push('/login');
        return;
      }

      const userKey = `zkkyc_master_${activePhone}`;
      const key = localStorage.getItem(userKey);
      
      if (!key) {
        router.push('/login');
        return;
      }

      const savedPhi = sessionStorage.getItem('zkkyc_phi');
      const savedAddress = sessionStorage.getItem('zkkyc_address');
      
      if (savedPhi) setPhi(savedPhi);
      if (savedAddress) setWalletAddress(savedAddress);

      try {
        const { supabase } = await import('@/lib/supabase');
        const { count } = await supabase
          .from('identities')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved');
        setAnonymitySetSize(count || 0);

        if (savedPhi) {
          const { data: myIdentity } = await supabase
            .from('identities')
            .select('status')
            .eq('commitment', savedPhi)
            .maybeSingle();
          setIdentityStatus(myIdentity?.status || 'unknown');
        }
      } catch (e) {
        console.warn('[DASHBOARD] Failed to fetch data');
      }

      try {
        const phone = activePhone || localStorage.getItem('zkkyc_phone');
        if (phone) {
          const hp = await hashPhone(phone);
          const res = await fetch(`/api/identity/backup?phoneHash=${hp}`);
          const data = await res.json();
          if (data.found) setBackupStatus('exists');
        }
      } catch (e) {
        console.error('[DASHBOARD] Failed to check backup status');
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('zkkyc_session');
    sessionStorage.removeItem('zkkyc_phi');
    sessionStorage.removeItem('zkkyc_phone');
    router.push('/login');
  };

  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] pt-16">
        <aside className="w-64 border-r border-border bg-card/30 hidden md:block shrink-0">
          <div className="p-6 space-y-3">
            <div className="h-10 w-full rounded-lg bg-secondary/50 animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-secondary/50 animate-pulse" />
          </div>
        </aside>
        <main className="flex-1 p-8 lg:p-12">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="space-y-3">
              <div className="h-4 w-32 bg-secondary/50 rounded animate-pulse" />
              <div className="h-10 w-64 bg-secondary/50 rounded animate-pulse" />
              <div className="h-4 w-96 bg-secondary/30 rounded animate-pulse" />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-xl border border-border bg-card p-6 h-64 animate-pulse bg-secondary/20" />
              <div className="rounded-xl border border-border bg-card p-6 h-64 animate-pulse bg-secondary/20" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-border bg-card p-6 h-52 animate-pulse bg-secondary/20" />
              <div className="rounded-xl border border-border bg-card p-6 h-52 animate-pulse bg-secondary/20" />
              <div className="rounded-xl border border-border bg-card p-6 h-52 animate-pulse bg-secondary/20" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] pt-16">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-xl hidden md:block shrink-0">
        <div className="p-6 flex flex-col h-full">
          <nav className="space-y-1.5 flex-1">
            <Link 
              href="/dashboard" 
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all group",
                pathname === '/dashboard' 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <LayoutDashboard size={18} className={cn(pathname === '/dashboard' ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              My Identity
            </Link>
            <Link 
              href="/services" 
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all group",
                pathname === '/services' 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Building2 size={18} className={cn(pathname === '/services' ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              Services
            </Link>
          </nav>

          <div className="pt-6 border-t border-border mt-auto space-y-1.5">
            <button 
              onClick={() => {
                const activePhone = sessionStorage.getItem('zkkyc_phone') || '';
                if (confirm('This will clear your local identity for the current account. Ensure you have your Master Password to restore it later. Proceed?')) {
                  // Only clear current user's data, not all localStorage
                  localStorage.removeItem(`zkkyc_master_${activePhone}`);
                  localStorage.removeItem(`zkkyc_phi_${activePhone}`);
                  localStorage.removeItem('zkkyc_phone');
                  localStorage.removeItem('zkkyc_phi_check');
                  sessionStorage.clear();
                  router.push('/register');
                }
              }} 
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-all group"
            >
              <UserPlus size={18} />
              Register New
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all group"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <AnimateIn>
          <div className="max-w-5xl mx-auto">
            <header className="mb-10">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
                <Shield size={14} /> Identity Dashboard
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Identity Hub</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Securely manage your private credentials, Stellar wallet, and decentralized backups.
              </p>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Identity Status Card */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
                <div className={cn(
                  "absolute top-0 right-0 h-1 w-full",
                  phi ? "bg-emerald-500" : "bg-amber-500"
                )} />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Shield size={20} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                    phi ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {phi ? 'Decrypted' : 'Encrypted'}
                  </span>
                </div>

                <div className="space-y-6">
                  {!phi ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <p className="text-sm text-muted-foreground">Your identity is locked. Enter your master password to decrypt your credentials.</p>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input 
                          type="password"
                          placeholder="Master Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-background border border-input pl-10 pr-4 py-3 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <Button 
                        disabled={loading || !password}
                        onClick={async () => {
                          const phone = sessionStorage.getItem('zkkyc_phone') || localStorage.getItem('zkkyc_phone') || '';
                          setLoading(true);
                          try {
                            const keys = await loadKeyFromStorage(password, phone);
                            const p = await computeMasterIdentity(keys.sk, keys.r, keys.birthYear, keys.countryCode);
                            setPhi(p);
                            sessionStorage.setItem('zkkyc_phi', p);
                            setError(null);
                          } catch (_e) {
                            setError('Incorrect master password');
                          }
                          setLoading(false);
                        }}
                        className="w-full h-11"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                        Unlock Private Data
                      </Button>
                      {error && <p className="text-destructive text-[11px] font-medium flex items-center gap-1.5"><XCircle size={12} /> {error}</p>}
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          Private Commitment <CheckCircle2 size={12} className="text-emerald-500" />
                        </p>
                        <div className="p-3 rounded-lg bg-secondary/50 border border-border font-mono text-[10px] break-all text-primary leading-relaxed">
                          {phi}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Anonymity Set</p>
                          <p className="text-2xl font-bold">{anonymitySetSize}</p>
                          <p className="text-[9px] text-muted-foreground mt-1">Verified identities</p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Verification Status</p>
                          <div className={cn(
                            "flex items-center gap-1.5 font-bold text-sm",
                            identityStatus === 'approved' ? 'text-emerald-500' :
                            identityStatus === 'pending' ? 'text-amber-500' :
                            identityStatus === 'rejected' ? 'text-rose-500' :
                            'text-muted-foreground'
                          )}>
                            {identityStatus === 'approved' ? <CheckCircle2 size={16} /> :
                             identityStatus === 'pending' ? <Clock size={16} /> :
                             identityStatus === 'rejected' ? <XCircle size={16} /> : null}
                            {identityStatus === 'approved' ? 'Verified' :
                             identityStatus === 'pending' ? 'Pending' :
                             identityStatus === 'rejected' ? 'Rejected' : 'Unknown'}
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1">On-chain registry</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stellar Wallet Card */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold">
                    <CreditCard size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500">
                    Stellar Testnet
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/5 to-primary/5 border border-indigo-500/10">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Account Address</p>
                      <div className="flex items-center justify-between">
                         <p className="font-mono text-lg font-bold tracking-tight">
                          {walletAddress 
                            ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
                            : 'G...NONE'
                          }
                        </p>
                        <button className="text-muted-foreground hover:text-primary transition-colors">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>

                    {walletAddress && (
                      <Button variant="outline" className="w-full h-12 gap-2" asChild>
                        <a 
                          href={`https://stellar.expert/explorer/testnet/account/${walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Explorer <ExternalLink size={14} />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    Connected to Stellar Horizon API
                  </div>
                </div>
              </div>

              {/* Security & Backups */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                   <h3 className="font-bold text-xl">Identity Sovereignty</h3>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Cloud Backup Action */}
                  <div className={cn(
                    "rounded-xl border p-6 flex flex-col transition-all group",
                    backupStatus === 'exists' 
                      ? "border-emerald-500/20 bg-emerald-500/5" 
                      : "border-border bg-card hover:border-primary/30"
                  )}>
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center mb-4 transition-colors",
                      backupStatus === 'exists' ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/10 text-primary"
                    )}>
                      {backupStatus === 'syncing' ? <Loader2 size={20} className="animate-spin" /> : <Cloud size={20} />}
                    </div>
                    
                    <h4 className="font-bold mb-2">Cloud Recovery</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                      {backupStatus === 'exists' 
                        ? 'Your identity is safely synchronized with our encrypted cloud storage. Use this to restore your identity on a new device.' 
                        : 'Protect against device loss by storing an encrypted backup of your master key in the cloud.'}
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                        <input 
                          type="password"
                          placeholder="Confirm Master Pwd"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-background border border-border px-8 py-2.5 rounded-md text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <Button 
                        size="sm"
                        disabled={loading || backupStatus === 'syncing' || !password}
                        onClick={async () => {
                          const phone = sessionStorage.getItem('zkkyc_phone') || localStorage.getItem('zkkyc_phone');
                          if (!phone) return;
                          setBackupStatus('syncing');
                          try {
                            const material = await loadKeyFromStorage(password, phone);
                            const backup = await encryptForBackup(password, material);
                            const phoneHash = await hashPhone(phone);
                            const res = await fetch('/api/identity/backup', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ phoneHash, ...backup })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setBackupStatus('exists');
                              setError(null);
                            } else {
                              throw new Error(data.error || 'Upload failed');
                            }
                          } catch (e: any) {
                            setBackupStatus('error');
                            setError(e.message);
                          }
                        }}
                        className={cn(
                          "w-full text-[11px] font-bold h-10",
                          backupStatus === 'exists' ? "bg-emerald-600 hover:bg-emerald-500" : ""
                        )}
                      >
                        {backupStatus === 'syncing' ? 'Syncing...' : (backupStatus === 'exists' ? 'Update Backup' : 'Upload Backup')}
                      </Button>
                      <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/5 border border-amber-500/10">
                        <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-500/80 leading-relaxed">
                          This backup is encrypted with your <strong>Master Password</strong>. If you forget your password, the backup cannot be recovered. Write your password down and store it safely.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Local Export */}
                  <div className="rounded-xl border border-border bg-card p-6 flex flex-col hover:border-primary/30 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Download size={20} />
                    </div>
                    <h4 className="font-bold mb-2">Local Archive</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                      Download a raw, encrypted JSON snapshot of your entire identity wallet for cold storage.
                    </p>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="mt-6 w-full text-[11px] font-bold h-10"
                      onClick={() => {
                        const phone = sessionStorage.getItem('zkkyc_phone') || localStorage.getItem('zkkyc_phone') || '';
                        const userKey = `zkkyc_master_${phone}`;
                        const key = localStorage.getItem(userKey);
                        if (key) {
                          const blob = new Blob([JSON.stringify({ backup: key, phi, wallet: walletAddress })], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `zkkyc_${phone.replace('+', '')}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                    >
                      Export JSON Bundle
                    </Button>
                  </div>

                  {/* Service Access */}
                  <div className="rounded-xl border border-border bg-card p-6 flex flex-col hover:border-primary/30 transition-all group">
                    <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Building2 size={20} />
                    </div>
                    <h4 className="font-bold mb-2">Service Access</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                      Use your anonymous credentials to access third-party services without revealing your identity.
                    </p>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="mt-6 w-full text-[11px] font-bold h-10 gap-1.5"
                      asChild
                    >
                      <Link href="/services">
                        Go to Services <ChevronRight size={14} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>
      </main>
    </div>
  );
}
