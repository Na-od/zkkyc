'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { connectFreighterWallet, registerMasterIdentity, fundWithFriendbot, payRegistrationFee } from '@/lib/stellar';
import { generateMasterKey, computeMasterIdentity, saveKeyToStorage, exportKeyFile } from '@/lib/masterKey';
import { supabase } from '@/lib/supabase';

// Redesign Imports
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Loader2, ArrowLeft, Copy, Check, Smartphone, Wallet, Key, Globe, Database, AlertCircle, Upload, Image as ImageIcon } from "lucide-react";
import AnimateIn from "@/components/AnimateIn";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { name: 'Ethiopia', code: '231' },
  { name: 'United States', code: '840' },
  { name: 'United Kingdom', code: '826' },
  { name: 'Canada', code: '124' },
  { name: 'Germany', code: '276' },
  { name: 'France', code: '250' },
  { name: 'India', code: '356' },
  { name: 'China', code: '156' },
  { name: 'Japan', code: '392' },
  { name: 'Brazil', code: '076' },
  { name: 'South Africa', code: '710' },
  { name: 'Nigeria', code: '566' },
  { name: 'Kenya', code: '404' },
  { name: 'Australia', code: '036' },
  { name: 'South Korea', code: '410' },
  { name: 'Mexico', code: '484' },
  { name: 'Italy', code: '380' },
  { name: 'Spain', code: '724' },
  { name: 'Turkey', code: '792' },
  { name: 'Saudi Arabia', code: '682' },
  { name: 'UAE', code: '784' },
  { name: 'Egypt', code: '818' },
  { name: 'Argentina', code: '032' },
  { name: 'Indonesia', code: '360' },
  { name: 'Russia', code: '643' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Phone State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [token, setToken] = useState('');

  // Step 2: Wallet State
  const [address, setAddress] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretField, setShowSecretField] = useState(false);

  // Step 3: Identity State
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [countryCode, setCountryCode] = useState('231'); // Default Ethiopia
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [idScanFile, setIdScanFile] = useState<File | null>(null);
  const [idScanPreview, setIdScanPreview] = useState<string | null>(null);
  const [masterIdentity, setMasterIdentity] = useState('');
  const [keyMaterial, setKeyMaterial] = useState<any>(null);

  // Step 5: Success State
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);

  // --- Actions ---

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) setSmsSent(true);
      else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const hashPhoneNumber = async (phoneNumber: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(phoneNumber);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const phoneHash = await hashPhoneNumber(phone);
      const { data: existingIdentity } = await supabase
        .from('identities')
        .select('id')
        .eq('phone_hash', phoneHash)
        .maybeSingle();

      if (existingIdentity) {
        throw new Error('This phone number is already registered. Please login.');
      }

      const res = await fetch('/api/sms/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setStep(2);
      } else {
        throw new Error(data.error || 'Invalid OTP');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const pubKey = await connectFreighterWallet();
      
      // Check if this wallet is already registered
      const { data: existingWallet } = await supabase
        .from('identities')
        .select('id')
        .eq('wallet_address', pubKey)
        .maybeSingle();

      if (existingWallet) {
        throw new Error('This wallet address is already registered to another account.');
      }

      setAddress(pubKey);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleManualAddressSubmit = async () => {
    if (!manualAddress.startsWith('G') || manualAddress.length !== 56) {
      setError('Invalid Stellar Public Key. It should start with "G" and be 56 characters long.');
      return;
    }
    const { data: existingWallet } = await supabase
      .from('identities')
      .select('id')
      .eq('wallet_address', manualAddress)
      .maybeSingle();
    if (existingWallet) {
      setError('This wallet address is already registered. Please use the Login page instead.');
      return;
    }
    setAddress(manualAddress);
    setStep(3);
  };

  const handleGenerateIdentity = async () => {
    if (!birthYear || isNaN(parseInt(birthYear))) {
      setError('Please enter a valid birth year');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Check if ID number is already registered
      const { data: existingID } = await supabase
        .from('identities')
        .select('id')
        .eq('id_number', idNumber)
        .maybeSingle();

      if (existingID) {
        throw new Error('This ID number is already registered to another account.');
      }

      const by = parseInt(birthYear);
      const cc = parseInt(countryCode);
      const { sk, r } = await generateMasterKey(by, cc);
      const phi = await computeMasterIdentity(sk, r, by, cc);
      setKeyMaterial({ sk, r, birthYear: by, countryCode: cc });
      setMasterIdentity(phi);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleSaveIdentity = async () => {
    setLoading(true);
    try {
      await saveKeyToStorage(keyMaterial.sk, keyMaterial.r, password, phone, keyMaterial.birthYear, keyMaterial.countryCode);
      setStep(4);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleRegisterOnChain = async () => {
    setLoading(true);
    setError(null);
    try {
      const secret = showSecretField ? secretKey : undefined;
      await payRegistrationFee(address, secret);
      const hash = await registerMasterIdentity(masterIdentity, address, secret);
      if (hash) {
        setTxHash(hash);
        sessionStorage.setItem('zkkyc_address', address);
        sessionStorage.setItem('zkkyc_phi', masterIdentity);
        sessionStorage.setItem('zkkyc_phone', phone);
        sessionStorage.setItem('zkkyc_session', Date.now().toString());
        localStorage.setItem('zkkyc_phone', phone); // Needed by dashboard backup feature

        try {
          const phoneHash = await hashPhoneNumber(phone);
          let idScanUrl: string | null = null;
          if (idScanFile) {
            idScanUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target?.result as string);
              reader.readAsDataURL(idScanFile);
            });
          }
          await supabase.from('identities').upsert({
            commitment: masterIdentity,
            wallet_address: address,
            phone_hash: phoneHash,
            ledger_sequence: 0,
            transaction_hash: hash,
            status: 'pending',
            full_name: fullName,
            id_type: idType,
            id_number: idNumber,
            id_scan_url: idScanUrl
          }, { onConflict: 'commitment' });
        } catch (syncErr) {
          console.warn('Sync failed:', syncErr);
        }
        setStep(5);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <section className="min-h-screen flex items-center pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-lg">
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
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Create Identity
                </h2>
                <p className="text-xs text-muted-foreground">
                  Step {step} of 4 • {Math.round((step / 4) * 100)}% Complete
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="flex gap-1 mb-8">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-500",
                    step >= s ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in zoom-in-95 duration-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* STEP 1: Phone Verification */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-up">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 XXX XXX XXX"
                      className="mt-2 w-full rounded-md border border-input bg-secondary/30 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>

                  {smsSent && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        6-Digit OTP
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="000000"
                        className="mt-2 w-full rounded-md border border-input bg-secondary/30 px-4 py-3 text-center tracking-widest text-xl font-bold focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    We use your phone to prevent Sybil attacks. Only a secure hash is stored.
                  </p>

                  <Button
                    className="w-full"
                    onClick={smsSent ? handleVerifyOTP : handleSendOTP}
                    disabled={loading || !phone}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {smsSent ? 'Verify & Continue' : 'Send Verification SMS'}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Wallet Connection */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-up">
                <div className="text-center py-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-base font-medium">Connect Stellar Wallet</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect your wallet to pay the registration fee on-chain.
                  </p>
                </div>

                {!showManual ? (
                  <Button
                    variant="hero"
                    className="w-full h-14"
                    onClick={handleConnectWallet}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShipWheelIcon className="mr-2 h-5 w-5" />}
                    Connect Freighter Wallet
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Public Key (starts with G)
                      </label>
                      <input
                        type="text"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="GD..."
                        className="mt-2 w-full rounded-md border border-input bg-secondary/30 px-4 py-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                    <Button className="w-full" onClick={handleManualAddressSubmit} disabled={loading || !manualAddress}>
                      Use Manual Address
                    </Button>
                  </div>
                )}

                <button
                  onClick={() => setShowManual(!showManual)}
                  className="w-full text-center text-xs text-primary hover:underline"
                >
                  {showManual ? '← Back to Wallet Connection' : 'Enter address manually instead'}
                </button>
              </div>
            )}

            {/* STEP 3: Master Identity Generation */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-up">
                {!masterIdentity ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase">
                        <Database className="h-3.5 w-3.5" />
                        KYC Verification
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full Legal Name"
                        className="w-full rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          className="rounded-md border border-input bg-secondary/30 px-3 py-2 text-xs focus:outline-none"
                        >
                          <option value="national_id">National ID</option>
                          <option value="passport">Passport</option>
                        </select>
                        <input
                          type="text"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder="ID Number"
                          className="w-full rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      
                      <div className="pt-2">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-secondary/20 hover:bg-secondary/30 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {idScanPreview ? (
                              <div className="relative h-24 w-full flex items-center justify-center">
                                <img src={idScanPreview} alt="ID Preview" className="h-full object-contain rounded" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                  <ImageIcon className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-xs text-muted-foreground">
                                  <span className="font-semibold">Click to upload</span> ID Scan
                                </p>
                                <p className="text-[10px] text-muted-foreground/60">PNG, JPG or PDF (MAX. 5MB)</p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIdScanFile(file);
                                const reader = new FileReader();
                                reader.onload = (ev) => setIdScanPreview(ev.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase">
                        <Shield className="h-3.5 w-3.5" />
                        ZK Attributes
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={birthYear}
                          onChange={(e) => setBirthYear(e.target.value)}
                          placeholder="Birth Year"
                          className="w-full rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm focus:outline-none"
                        />
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-full rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm focus:outline-none"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleGenerateIdentity} disabled={loading || !fullName || !idNumber || !idScanFile}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                      Generate Private Key
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Master Identity (Phi)
                      </label>
                      <div className="mt-2 rounded-md border border-border bg-secondary/30 p-3 font-mono text-[10px] text-primary break-all">
                        {masterIdentity}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Set Master Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Required for local storage"
                        className="mt-2 w-full rounded-md border border-input bg-secondary/30 px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 text-xs" onClick={() => exportKeyFile(keyMaterial.sk, keyMaterial.r)}>
                        Backup File
                      </Button>
                      <Button className="flex-[2]" onClick={handleSaveIdentity} disabled={!password || loading}>
                        Save & Continue
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: On-Chain Registration */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-up">
                <div className="text-center py-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-base font-medium">Publish to Blockchain</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your identity will be added to the Stellar testnet.
                    <br />Fee: 0.1 XLM
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">COMMITMENT</span>
                    <span className="font-mono text-primary">{masterIdentity.slice(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">WALLET</span>
                    <span className="font-mono text-muted-foreground">{address.slice(0, 12)}...</span>
                  </div>
                </div>

                <Button className="w-full h-14 text-base" onClick={handleRegisterOnChain} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-5 w-5" />}
                  Register On-Chain
                </Button>

                {showSecretField ? (
                  <div className="space-y-4 pt-4 border-t border-border animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] text-amber-500 font-medium">
                      ⚠️ Use Secret Key fallback only if Freighter fails.
                    </p>
                    <input
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Stellar Secret Key (Starts with S)"
                      className="w-full rounded-md border border-input bg-secondary/30 px-4 py-3 font-mono text-xs focus:outline-none"
                    />
                    <Button variant="outline" className="w-full" onClick={handleRegisterOnChain} disabled={loading || !secretKey}>
                      Sign with Secret Key
                    </Button>
                  </div>
                ) : (
                  <button onClick={() => setShowSecretField(true)} className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors">
                    Trouble signing? Use Secret Key fallback
                  </button>
                )}
              </div>
            )}

            {/* STEP 5: Success */}
            {step === 5 && (
              <div className="space-y-6 animate-fade-up text-center py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-primary animate-bounce-short" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Identity Registered!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your credentials are now live on the Stellar network.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3 text-left">
                  <div className="flex justify-between items-center group">
                    <span className="text-[10px] text-muted-foreground font-mono">PHI</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-primary">{masterIdentity.slice(0, 16)}...</span>
                      <button onClick={() => handleCopy(masterIdentity)}>
                        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground group-hover:text-primary" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground font-mono">TX</span>
                    <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-primary underline truncate max-w-[150px]">
                      {txHash.slice(0, 16)}...
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button className="w-full h-12 text-base" onClick={() => router.push('/dashboard')}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/services')}>
                    Explore Services
                  </Button>
                </div>
              </div>
            )}
          </div>
        </AnimateIn>

        <p className="text-center mt-8 text-xs text-muted-foreground">
          Built on <span className="text-primary font-medium">Stellar Soroban</span> • Security through Mathematics
        </p>
      </div>
    </section>
  );
}

function ShipWheelIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="m4.93 4.93 2.83 2.83" />
      <path d="m16.24 16.24 2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="m4.93 19.07 2.83-2.83" />
      <path d="m16.24 7.76 2.83-2.83" />
    </svg>
  );
}
