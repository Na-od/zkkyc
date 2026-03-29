'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getAnonymitySet, submitRegistration } from '@/lib/stellar';
import { loadKeyFromStorage, computeMasterIdentity } from '@/lib/masterKey';
import { useZKProof } from '@/hooks/useZKProof';
import { supabase } from '@/lib/supabase';

// Redesign Imports
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Building2, 
  LayoutDashboard, 
  LogOut, 
  UserPlus, 
  RefreshCw, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Loader2,
  ChevronRight,
  Globe,
  Smartphone
} from "lucide-react";
import AnimateIn from "@/components/AnimateIn";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  min_age: number;
  callback_url: string;
}

export default function ServicesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [connectingServiceId, setConnectingServiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [identities, setIdentities] = useState<string[]>([]);
  const [myPhi, setMyPhi] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [redirectInfo, setRedirectInfo] = useState<{ url: string; pseudonym: string; nullifier: string } | null>(null);
  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const { generateProof, status: zkStatus } = useZKProof();

  useEffect(() => {
    const checkAuth = () => {
      const session = sessionStorage.getItem('zkkyc_session');
      const activePhone = sessionStorage.getItem('zkkyc_phone');
      
      if (!session || !activePhone) {
        router.push('/login');
        return;
      }

      const userKey = `zkkyc_master_${activePhone}`;
      const key = localStorage.getItem(userKey);
      
      if (!key) {
        router.push('/login');
        return;
      }

      const saved = sessionStorage.getItem('zkkyc_connected_services');
      if (saved) setConnectedServices(JSON.parse(saved));
    };
    checkAuth();
    loadAnonymitySet();
  }, [router]);

  const loadAnonymitySet = async () => {
    try {
      const { getCachedAnonymitySet } = await import('@/lib/indexer');
      const ids = await getCachedAnonymitySet();
      setIdentities(ids);
    } catch (e: any) {
      setError(`Failed to sync anonymity set: ${e.message}`);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setServices(data || []);
    } catch (e) {
      console.error('[SERVICES] Failed to load services');
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleUnlockAndConnect = async (serviceId: string, serviceName: string, minAge: number = 0) => {
    setConnectingServiceId(serviceId);
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRedirectInfo(null);

    // Scroll to the clicked card
    const cardEl = document.getElementById(`service-card-${serviceId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    try {
      const phone = sessionStorage.getItem('zkkyc_phone') || '';
      const keyMaterial = await loadKeyFromStorage(password, phone);
      const computedPhi = await computeMasterIdentity(keyMaterial.sk, keyMaterial.r, keyMaterial.birthYear, keyMaterial.countryCode);
      setMyPhi(computedPhi);

      const { supabase } = await import('@/lib/supabase');
      const { data: myIdentity } = await supabase
        .from('identities')
        .select('status')
        .eq('commitment', computedPhi)
        .maybeSingle();

      if (!myIdentity || myIdentity.status !== 'approved') {
        const statusMsg = myIdentity?.status === 'pending' 
          ? 'Your identity is still pending approval by a Trusted Issuer.'
          : myIdentity?.status === 'rejected'
          ? 'Your identity has been rejected by the Trusted Issuer.'
          : 'Your identity was not found in the system. Please register first.';
        throw new Error(statusMsg);
      }

      const { computeNullifier } = await import('@/lib/nullifier');
      const { computeServiceId, computePseudonymCommitment } = await import('@/lib/merkleTree');
      const serviceIdBI = await computeServiceId(serviceName);
      const nullifierHex = await computeNullifier(keyMaterial.sk, serviceName);
      const nullifier = '0x' + nullifierHex;
      
      const skBI = BigInt('0x' + Buffer.from(keyMaterial.sk).toString('hex'));
      const rBI = BigInt('0x' + Buffer.from(keyMaterial.r).toString('hex'));
      const pseudonymBI = await computePseudonymCommitment(skBI, rBI, serviceIdBI);
      const pseudonym = 'anon_' + pseudonymBI.toString(16).slice(0, 8);

      const { data: existing } = await supabase
        .from('registrations')
        .select('id')
        .eq('service_id', serviceId)
        .eq('nullifier', nullifier)
        .maybeSingle();

      if (existing) {
        setSuccess(`Already connected as "${pseudonym}".`);
        const updated = [...connectedServices];
        if (!updated.includes(serviceId)) {
          updated.push(serviceId);
          setConnectedServices(updated);
          sessionStorage.setItem('zkkyc_connected_services', JSON.stringify(updated));
        }
        const service = services.find(s => s.id === serviceId);
        if (service?.callback_url) {
          setRedirectInfo({ url: service.callback_url, pseudonym, nullifier });
        }
        setLoading(false);
        return;
      }
      
      const { getCachedAnonymitySet } = await import('@/lib/indexer');
      const ids = await getCachedAnonymitySet();
      setIdentities(ids);

      if (ids.length === 0) {
        throw new Error("The anonymity set is empty.");
      }

      const myIndex = ids.findIndex(id => id.toLowerCase() === computedPhi.toLowerCase());

      if (myIndex === -1) {
        throw new Error(`Identity not found in anonymity set.`);
      }

      const currentYear = new Date().getFullYear();
      const { proof, publicSignals } = await generateProof({
        sk: keyMaterial.sk,
        r: keyMaterial.r,
        birthYear: keyMaterial.birthYear,
        countryCode: keyMaterial.countryCode,
        anonymitySet: ids,
        myIndex,
        serviceName,
        currentYear,
        minAge
      });
      
      const res = await fetch('/api/verify/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          serviceName,
          proof,
          publicSignals,
          nullifier,
          pseudonymCommitment: '0x' + pseudonymBI.toString(16).padStart(64, '0'),
          minAge
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Proof verification failed');

      const { error: insertError } = await supabase.from('registrations').insert({
        service_id: serviceId,
        nullifier: nullifier,
        pseudonym: pseudonym,
        transaction_hash: 'zk_' + Date.now(),
      });

      if (insertError) throw new Error(insertError.message);

      setSuccess(`Successfully connected securely!`);
      const updated = [...connectedServices, serviceId];
      setConnectedServices(updated);
      sessionStorage.setItem('zkkyc_connected_services', JSON.stringify(updated));

      const service = services.find(s => s.id === serviceId);
      if (service?.callback_url) {
        setRedirectInfo({ url: service.callback_url, pseudonym, nullifier });
      }
    } catch (e: any) {
      if (e.message.includes('Assert Failed')) {
        setError(`Age requirement not met for ${serviceName}.`);
      } else {
        setError(e.message);
      }
    }
    setLoading(false);
    setConnectingServiceId(null);
  };

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
              <LayoutDashboard size={18} />
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
              <Building2 size={18} />
              Services
            </Link>
          </nav>

          <div className="pt-6 border-t border-border mt-auto space-y-1.5">
            <button 
              onClick={() => {
                if (confirm('Clear local identity?')) {
                  localStorage.clear();
                  router.push('/register');
                }
              }} 
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-all group"
            >
              <UserPlus size={18} />
              Register New
            </button>
            <button 
              onClick={() => {
                sessionStorage.clear();
                router.push('/login');
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all group"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <AnimateIn>
          <div className="max-w-5xl mx-auto">
            <header className="mb-10">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
                <Globe size={14} /> Ecosystem Directory
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Verified Services</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Browse and connect to third-party applications using zero-knowledge proofs. Your PII never leaves your browser.
              </p>
            </header>

            {!unlocked ? (
              <div className="max-w-md mx-auto py-12">
                <div className="rounded-xl border border-border bg-card p-8 shadow-2xl text-center">
                  <div className="h-16 w-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Secure Directory</h2>
                  <p className="text-sm text-muted-foreground mb-8">Enter your master password to decrypt the service directory and enable proof generation.</p>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Master Password"
                        className="w-full bg-secondary/30 border border-input pl-10 pr-4 py-3 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        onKeyDown={(e) => e.key === 'Enter' && password && setUnlocked(true)}
                      />
                    </div>
                    <Button 
                      className="w-full h-12 text-base font-bold" 
                      onClick={() => setUnlocked(true)}
                      disabled={!password}
                    >
                      Unlock Directory
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                      Live Anonymity Set: {identities.length} Verified Users
                    </span>
                  </div>
                  <button 
                    onClick={loadAnonymitySet}
                    className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-70 transition-opacity"
                  >
                    <RefreshCw size={10} /> Sync Proof Data
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.length === 0 ? (
                    <div className="col-span-full py-24 text-center border border-dashed border-border rounded-xl">
                      <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No services registered in the directory yet.</p>
                    </div>
                  ) : services.map(service => (
                    <div key={service.id} id={`service-card-${service.id}`} className={cn(
                      "group rounded-xl border bg-card p-6 transition-all flex flex-col",
                      connectingServiceId === service.id 
                        ? "border-primary/40 shadow-xl shadow-primary/5 ring-1 ring-primary/20" 
                        : "border-border hover:shadow-xl hover:border-primary/20"
                    )}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="h-12 w-12 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                          {service.icon}
                        </div>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest",
                          service.min_age > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {service.min_age > 0 ? `Age ${service.min_age}+` : 'Universal'}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{service.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-8 flex-1">
                        {service.description}
                      </p>
                      
                      <Button 
                        onClick={() => handleUnlockAndConnect(service.id, service.name, service.min_age)}
                        disabled={(connectingServiceId !== null && connectingServiceId !== service.id) || identities.length === 0}
                        className={cn(
                          "w-full h-11 font-bold text-xs gap-2 transition-all",
                          connectedServices.includes(service.id)
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : connectingServiceId === service.id
                            ? "bg-primary/80 text-white"
                            : "bg-secondary text-foreground hover:bg-primary hover:text-white"
                        )}
                      >
                        {connectedServices.includes(service.id) 
                          ? <><Smartphone size={14} /> Open App</> 
                          : connectingServiceId === service.id
                          ? (zkStatus === 'generating' 
                            ? <><Loader2 size={14} className="animate-spin" /> Generating ZK Proof...</>
                            : <><Loader2 size={14} className="animate-spin" /> Connecting...</>)
                          : <><Shield size={14} /> Connect to Service</>}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(error || success) && (
              <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {error && (
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Proof Error</p>
                      <p className="text-xs mt-1 opacity-90">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">Connection Verified</p>
                        <p className="text-xs mt-1 opacity-90">{success}</p>
                      </div>
                    </div>
                    
                    {redirectInfo && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center backdrop-blur-sm">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-lg font-bold mb-2">Ready to Redirect</h4>
                        <p className="text-sm text-muted-foreground mb-8 mx-auto max-w-sm">
                          Verification complete. Return to the service provider with your anonymous cryptographic token.
                        </p>
                        <Button className="h-12 px-8 font-bold gap-2 shadow-lg shadow-primary/20" asChild>
                          <a href={`${redirectInfo.url}${redirectInfo.url.includes('?') ? '&' : '?'}pseudonym=${redirectInfo.pseudonym}&nullifier=${redirectInfo.nullifier}`}>
                            Go to Service Portal <ChevronRight size={18} />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </AnimateIn>
      </main>
    </div>
  );
}
