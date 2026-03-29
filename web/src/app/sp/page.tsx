'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Redesign Imports
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Smartphone, 
  Loader2, 
  ArrowLeft, 
  Shield, 
  Plus, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  ExternalLink,
  PlusCircle,
  Mail,
  Lock,
  Bookmark,
  ChevronRight,
  Globe,
  Settings,
  AlertCircle,
  User
} from "lucide-react";
import AnimateIn from "@/components/AnimateIn";
import { cn } from "@/lib/utils";

// Define the shape of our registrations and services
interface Registration {
  id: number;
  service_id: string;
  nullifier: string;
  pseudonym: string;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  min_age: number;
  callback_url: string;
  created_at: string;
}

export default function SPPortalPage() {
  const [tab, setTab] = useState('overview');
  
  // Auth State
  const [authenticated, setAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Data State
  const [users, setUsers] = useState<Registration[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // New Service Form State
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceIcon, setNewServiceIcon] = useState('🌟');
  const [newServiceMinAge, setNewServiceMinAge] = useState(0);
  const [newServiceCallback, setNewServiceCallback] = useState('');

  useEffect(() => {
    // Check local session
    const token = sessionStorage.getItem('zkkyc_sp_token');
    if (token) {
      setAuthenticated(true);
      fetchData();
    }
  }, []);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/sp/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          email,
          password,
          company_name: authMode === 'register' ? companyName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      sessionStorage.setItem('zkkyc_sp_token', data.token);
      sessionStorage.setItem('zkkyc_sp_id', data.provider.id);
      sessionStorage.setItem('zkkyc_sp_company', data.provider.company_name);
      
      setAuthenticated(true);
      fetchData();
    } catch (e: any) {
      setAuthError(e.message);
    }
    setAuthLoading(false);
  };

  const logout = () => {
    sessionStorage.removeItem('zkkyc_sp_token');
    sessionStorage.removeItem('zkkyc_sp_id');
    sessionStorage.removeItem('zkkyc_sp_company');
    setAuthenticated(false);
    setUsers([]);
    setServices([]);
  };

  const fetchData = async () => {
    setLoadingData(true);
    const spId = sessionStorage.getItem('zkkyc_sp_id');
    if (!spId) return;

    try {
      // Fetch services owned by this SP
      const { data: srvs, error: srvErr } = await supabase
        .from('services')
        .select('*')
        .eq('sp_id', spId);
      if (srvs) setServices(srvs);

      // Extract service IDs to fetch linked users
      const serviceIds = srvs?.map(s => s.id) || [];
      
      if (serviceIds.length > 0) {
        const { data: regs, error: regErr } = await supabase
          .from('registrations')
          .select('*')
          .in('service_id', serviceIds)
          .order('created_at', { ascending: false });
        if (regs) setUsers(regs);
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.error('Failed to fetch SP data:', e);
    }
    setLoadingData(false);
  };

  const handleCreateService = async () => {
    const spId = sessionStorage.getItem('zkkyc_sp_id');
    if (!spId || !newServiceName || !newServiceDesc) return;

    setLoadingData(true);
    try {
      const newId = newServiceName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
      const { error } = await supabase.from('services').insert({
        id: newId,
        sp_id: spId,
        name: newServiceName,
        description: newServiceDesc,
        icon: newServiceIcon,
        min_age: newServiceMinAge,
        callback_url: newServiceCallback
      });
      if (error) throw error;
      
      // Reset form
      setNewServiceName('');
      setNewServiceDesc('');
      setNewServiceMinAge(0);
      setNewServiceIcon('🌟');
      setNewServiceCallback('');
      setTab('overview');
      fetchData();
    } catch (e: any) {
      alert('Error creating service: ' + e.message);
      setLoadingData(false);
    }
  };

  if (!authenticated) {
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
              <div className="text-center mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-4 font-black text-2xl text-emerald-500">
                  <Building2 size={24} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Service Provider</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Integrated privacy-first verification for your business.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  {authError && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in zoom-in-95">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{authError}</p>
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Organization Name
                      </label>
                      <div className="relative mt-2">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input 
                          type="text" 
                          value={companyName} 
                          onChange={e => setCompanyName(e.target.value)} 
                          className="w-full rounded-md border border-input bg-secondary/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
                          placeholder="Acme Corp" 
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Work Email
                    </label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full rounded-md border border-input bg-secondary/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
                        placeholder="admin@acme.com" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative mt-2">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full rounded-md border border-input bg-secondary/30 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
                        placeholder="••••••••" 
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleAuth} 
                  disabled={authLoading || !email || !password} 
                  className="w-full h-11 font-bold group"
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {authMode === 'login' ? 'Access Dashboard' : 'Create Organization Account'}
                      <ChevronRight size={16} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    {authMode === 'login' 
                      ? "Don't have an account? Create one" 
                      : "Already have an account? Sign in"}
                  </button>
                </div>
              </div>

              {/* Other Portals */}
              <div className="mt-8 pt-8 border-t border-border/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center mb-4">
                  Other Portals
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm" className="h-11 gap-2 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary group" asChild>
                    <Link href="/login">
                      <User size={14} className="group-hover:scale-110 transition-transform" />
                      User Portal
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="h-11 gap-2 text-xs border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 group" asChild>
                    <Link href="/admin/login">
                      <Shield size={14} className="group-hover:scale-110 transition-transform" />
                      Issuer Admin
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    );
  }

  const company = typeof window !== 'undefined' ? sessionStorage.getItem('zkkyc_sp_company') : 'Organization';

  return (
    <div className="max-w-7xl mx-auto py-24 px-6 sm:px-8">
      <AnimateIn>
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest mb-2">
              <Shield size={14} /> Service Provider
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">{company} Dashboard</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Manage your verification endpoints and monitor anonymous user registrations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg shadow-emerald-600/10"
              onClick={() => setTab('new-service')}
            >
              <Plus size={18} /> New Endpoint
            </Button>
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut size={16} /> Logout
            </Button>
          </div>
        </header>

        <nav className="flex items-center gap-8 border-b border-border mb-10 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Services', icon: LayoutDashboard },
            { id: 'my-users', label: 'Verifications', icon: Users },
            { id: 'new-service', label: 'Create Service', icon: PlusCircle }
          ].map(({ id, label, icon: Icon }) => (
            <button 
              key={id} 
              onClick={() => setTab(id)}
              className={cn(
                "pb-4 px-1 text-sm font-semibold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap",
                tab === id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-[500px]">
          {tab === 'overview' && (
            <div className="animate-fade-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Active Service Endpoints</h3>
                <span className="text-xs bg-secondary px-2.5 py-1 rounded-full font-medium text-muted-foreground">
                  {services.length} Total
                </span>
              </div>
              
              {loadingData ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p>Fetching endpoints...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center bg-secondary/20 border border-dashed border-border rounded-xl py-20">
                  <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bookmark className="text-muted-foreground" size={24} />
                  </div>
                  <h4 className="text-lg font-medium">No services found</h4>
                  <p className="text-sm text-muted-foreground mt-2 mb-6">Create your first zkKYC verification endpoint to start onboarding users.</p>
                  <Button variant="secondary" onClick={() => setTab('new-service')}>Create New Service</Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map(s => (
                    <div key={s.id} className="group rounded-xl border border-border bg-card p-6 hover:shadow-xl hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="h-12 w-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          {s.icon}
                        </div>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest",
                          s.min_age > 0 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {s.min_age > 0 ? `Age ${s.min_age}+` : 'Universal'}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{s.name}</h4>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 h-10">{s.description}</p>
                      
                      <div className="mt-6 pt-6 border-t border-border space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-muted-foreground">ID:</span>
                          <span className="text-foreground">{s.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">CALLBACK:</span>
                          <span className="text-foreground truncate max-w-[150px]">{s.callback_url || 'Not configured'}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="w-full text-xs h-8 group-hover:bg-secondary transition-colors" asChild>
                          <a href={`/verify/${s.id}`} className="gap-1.5">
                            Test Integration <ExternalLink size={12} />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'new-service' && (
            <div className="mx-auto max-w-2xl bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fade-up">
              <div className="bg-secondary/30 p-6 border-b border-border">
                <h3 className="text-xl font-bold tracking-tight">Deployment Console</h3>
                <p className="text-sm text-muted-foreground mt-1">Configure a new on-chain verification endpoint.</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Service Name</label>
                    <input 
                      type="text" 
                      value={newServiceName} 
                      onChange={e => setNewServiceName(e.target.value)} 
                      className="w-full rounded-md border border-input bg-secondary/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
                      placeholder="e.g. Standard Bank Onboarding" 
                    />
                  </div>
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                    <textarea 
                      value={newServiceDesc} 
                      onChange={e => setNewServiceDesc(e.target.value)} 
                      rows={2}
                      className="w-full rounded-md border border-input bg-secondary/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
                      placeholder="What users will see when they verify their identity." 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Emoji Icon</label>
                    <div className="relative mt-2">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">✨</span>
                       <input 
                        type="text" 
                        value={newServiceIcon} 
                        onChange={e => setNewServiceIcon(e.target.value)} 
                        className="w-full rounded-md border border-input bg-secondary/20 pl-10 pr-4 py-3 text-sm focus:outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Min. Age Required</label>
                    <input 
                      type="number" 
                      value={newServiceMinAge} 
                      onChange={e => setNewServiceMinAge(parseInt(e.target.value) || 0)} 
                      className="w-full rounded-md border border-input bg-secondary/20 px-4 py-3 text-sm focus:outline-none" 
                      placeholder="0 = No limit" 
                    />
                  </div>
                  <div className="space-y-4 md:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Redirect URL (Success)</label>
                    <div className="relative mt-2">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="url" 
                        value={newServiceCallback} 
                        onChange={e => setNewServiceCallback(e.target.value)} 
                        className="w-full rounded-md border border-input bg-secondary/20 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" 
                        placeholder="https://your-app.com/callback" 
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Secure redirect after ZK proof submission. We will append <code className="text-primary font-bold">?pseudonym=...</code> to this URL.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                   <Button size="lg" className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg" onClick={handleCreateService} disabled={loadingData || !newServiceName}>
                    {loadingData ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Settings className="mr-2 h-5 w-5" />}
                    Deploy to Registry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tab === 'my-users' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-up shadow-sm">
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
                <div>
                   <h3 className="text-xl font-bold tracking-tight text-foreground">Verification Activity</h3>
                   <p className="text-xs text-muted-foreground mt-1">Review anonymous KYC connections to your services.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchData} className="gap-2 text-xs font-bold h-9">
                  <PlusCircle size={14} className="rotate-45" /> Refresh
                </Button>
              </div>

              {loadingData ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4 text-emerald-500" />
                  <p className="font-medium">Fetching verified users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="py-24 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No verified users recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                    <thead>
                      <tr className="bg-secondary/20 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold font-mono">
                        <th className="px-6 py-4">Service</th>
                        <th className="px-6 py-4">Pseudonym (PII-Free)</th>
                        <th className="px-6 py-4">Nullifier</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-secondary/10 transition-colors group">
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-2">
                               <div className="h-7 w-7 rounded bg-emerald-500/10 flex items-center justify-center text-sm shadow-sm">
                                 {services.find(s => s.id === user.service_id)?.icon || '🏢'}
                               </div>
                               <span className="text-sm font-bold text-foreground">
                                 {services.find(s => s.id === user.service_id)?.name || user.service_id}
                               </span>
                             </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-[11px] font-mono bg-emerald-500/5 text-emerald-500 px-2 py-1 rounded border border-emerald-500/10">
                              {user.pseudonym}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {user.nullifier.slice(0, 8)}...{user.nullifier.slice(-4)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                              <span className="block text-[8px] opacity-50">{new Date(user.created_at).toLocaleTimeString()}</span>
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                               <ChevronRight size={14} />
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </AnimateIn>
    </div>
  );
}

