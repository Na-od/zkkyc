'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Redesign Imports
import { Button } from "@/components/ui/button";
import { 
  Landmark, 
  ShieldCheck, 
  XCircle, 
  Eye, 
  RefreshCw,
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Smartphone,
  User,
  MoreVertical,
  ChevronRight,
  Loader2,
  Lock,
  X
} from "lucide-react";
import AnimateIn from "@/components/AnimateIn";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const router = useRouter();
  const [identities, setIdentities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [selectedScan, setSelectedScan] = useState<string | null>(null);

  useEffect(() => {
    // Check for admin session
    const token = sessionStorage.getItem('zkkyc_admin_token');
    // const user = sessionStorage.getItem('zkkyc_admin_user'); // Removed as per admin/login/page.tsx update
    if (!token) {
      router.push('/admin/login');
      return;
    }
    setAuthenticated(true);
    setAdminUser('Issuer Admin');
    fetchIdentities();
  }, [router]);

  const fetchIdentities = async () => {
    const { data, error } = await supabase
      .from('identities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setIdentities(data);
    setLoading(false);
  };

  const handleApprove = async (id: number, commitment: string) => {
    setActionLoading(commitment);
    const { error } = await supabase
      .from('identities')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      alert('Failed to approve: ' + error.message);
    } else {
      setIdentities(identities.map(i => i.id === id ? { ...i, status: 'approved' } : i));
    }
    setActionLoading(null);
  };

  const handleReject = async (id: number, commitment: string) => {
    setActionLoading(commitment);
    const { error } = await supabase
      .from('identities')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      alert('Failed to reject: ' + error.message);
    } else {
      setIdentities(identities.map(i => i.id === id ? { ...i, status: 'rejected' } : i));
    }
    setActionLoading(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('zkkyc_admin_token');
    router.push('/admin/login');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-7xl">
        <AnimateIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest mb-2">
                <Landmark size={14} /> Issuer Authority
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Compliance Terminal</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Review identity claims, verify physical documents, and authorize users into the global anonymity set.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end px-4 py-2 bg-secondary/30 rounded-lg border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Authenticated As</span>
                <span className="text-sm font-bold text-amber-500">{adminUser}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 h-10 px-4 font-bold border-rose-500/20 text-rose-500 hover:bg-rose-500/10">
                <LogOut size={16} /> Logout
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-up">
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Identity Registry</h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-black uppercase">
                  {identities.length} Pending
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchIdentities} className="gap-2 text-xs font-bold h-9">
                <RefreshCw size={14} /> Refresh
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/20 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold font-mono">
                    <th className="px-6 py-4">Applicant</th>
                    <th className="px-6 py-4">Document Details</th>
                    <th className="px-6 py-4">Identity (Phi)</th>
                    <th className="px-6 py-4">Scan</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {identities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No identity verification requests found.</p>
                      </td>
                    </tr>
                  ) : identities.map((identity) => (
                    <tr key={identity.id} className="hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="font-bold text-foreground">{identity.full_name || 'Anonymous Applicant'}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 font-medium">
                          <Smartphone size={10} /> {identity.phone_hash ? identity.phone_hash.slice(0, 10) + '...' : 'Unlinked'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex max-w-fit px-2 py-0.5 bg-secondary text-primary rounded font-black uppercase text-[9px] tracking-wider">
                            {identity.id_type ? identity.id_type.replace('_', ' ') : 'KYC_DOC'}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground tracking-tighter">
                            #{identity.id_number || 'UNKNOWN_ID'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-mono text-amber-600 dark:text-amber-500 text-[10px]">
                        {identity.commitment.slice(0, 8)}...{identity.commitment.slice(-8)}
                      </td>
                      <td className="px-6 py-5">
                        {identity.id_scan_url ? (
                          <button 
                            onClick={() => setSelectedScan(identity.id_scan_url)}
                            className="relative h-10 w-14 rounded overflow-hidden border border-border hover:border-amber-500/50 transition-all group/img"
                          >
                            <img 
                              src={identity.id_scan_url} 
                              alt="ID Scan" 
                              className="h-full w-full object-cover transition-transform group-hover/img:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={14} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="h-10 w-14 rounded bg-secondary/50 border border-border border-dashed flex items-center justify-center text-[8px] text-muted-foreground uppercase font-black">
                            NO_SCAN
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          identity.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          identity.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        )}>
                          {identity.status === 'approved' ? <CheckCircle2 size={10} /> :
                           identity.status === 'rejected' ? <XCircle size={10} /> :
                           <Clock size={10} />}
                          {identity.status || 'pending'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {identity.status === 'approved' || identity.status === 'rejected' ? (
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                           <CheckCircle2 size={12} /> Decided
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleReject(identity.id, identity.commitment)}
                              disabled={actionLoading === identity.commitment}
                              className="h-8 text-[10px] font-bold border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                            >
                              Reject
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(identity.id, identity.commitment)}
                              disabled={actionLoading === identity.commitment}
                              className="h-8 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              {actionLoading === identity.commitment ? <Loader2 size={12} className="animate-spin" /> : 'Approve'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimateIn>

        {/* Full-size ID Scan Modal */}
        {selectedScan && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300"
            onClick={() => setSelectedScan(null)}
          >
            <div 
              className="relative max-w-4xl w-full bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
                <h4 className="font-bold text-sm uppercase tracking-wider">Document Verification</h4>
                <Button variant="ghost" size="icon" onClick={() => setSelectedScan(null)} className="h-8 w-8 rounded-full">
                  <X size={18} />
                </Button>
              </div>
              <div className="p-2 bg-secondary/30">
                <img 
                  src={selectedScan} 
                  alt="Identity Document" 
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              </div>
              <div className="p-4 border-t border-border bg-secondary/10 flex justify-center">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 uppercase tracking-widest">
                  <ShieldCheck size={12} className="text-amber-500" /> Tamper-evident identity claim
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
