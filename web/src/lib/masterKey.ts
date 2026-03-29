import { buildPoseidon } from 'circomlibjs';

/**
 * Interface for the master key material.
 */
export interface MasterKeyMaterial {
  sk: Uint8Array; // Secret Key (32 bytes)
  r: Uint8Array;  // Randomness/Blinding (32 bytes)
  birthYear: number;
  countryCode: number;
}

/**
 * Generates a random master key and blinding factor.
 */
export async function generateMasterKey(birthYear: number, countryCode: number): Promise<MasterKeyMaterial> {
  const sk = window.crypto.getRandomValues(new Uint8Array(32));
  const r = window.crypto.getRandomValues(new Uint8Array(32));
  return { sk, r, birthYear, countryCode };
}

/**
 * Computes the Master Identity (Phi) = Poseidon(sk)
 * This is the public commitment stored on-chain.
 */
export async function computeMasterIdentity(sk: Uint8Array, r: Uint8Array, birthYear: number, countryCode: number): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  
  // Convert Uint8Array to BigInt for Poseidon
  const skBI = BigInt('0x' + Buffer.from(sk).toString('hex'));
  const rBI = BigInt('0x' + Buffer.from(r).toString('hex'));
  const byBI = BigInt(birthYear);
  const ccBI = BigInt(countryCode);
  
  const hash = poseidon([skBI, rBI, byBI, ccBI]);
  
  // Return hex string (32 bytes / 64 chars)
  return F.toObject(hash).toString(16).padStart(64, '0');
}

/**
 * Saves encrypted key material to localStorage.
 */
export async function saveKeyToStorage(sk: Uint8Array, r: Uint8Array, password: string, phone: string, birthYear: number, countryCode: number): Promise<void> {
  const encoder = new TextEncoder();
  const userKey = `zkkyc_master_${phone}`;
  const phiKey = `zkkyc_phi_${phone}`;
  
  // 1. Derive a key from the password
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // 2. Encrypt sk + r + birthYear + countryCode
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const dataToEncrypt = new Uint8Array(72);
  dataToEncrypt.set(sk, 0);
  dataToEncrypt.set(r, 32);
  const dv = new DataView(dataToEncrypt.buffer);
  dv.setUint32(64, birthYear, true);
  dv.setUint32(68, countryCode, true);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    dataToEncrypt
  );

  // 3. Store the blob (salt + iv + encrypted)
  const blob = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
  blob.set(salt);
  blob.set(iv, 16);
  blob.set(new Uint8Array(encrypted), 28);
  const binary = Array.from(blob).map(b => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  localStorage.setItem(userKey, base64);
  
  // Store the identity commitment (Phi) as a fingerprint to verify decryption later
  const phi = await computeMasterIdentity(sk, r, birthYear, countryCode);
  localStorage.setItem(phiKey, phi);
  
  // Also store it as 'zkkyc_phi_check' for the active session (legacy compatibility)
  localStorage.setItem('zkkyc_phi_check', phi);
}

/**
 * Loads and decrypts key material from localStorage.
 */
export async function loadKeyFromStorage(password: string, phone: string): Promise<MasterKeyMaterial> {
  const userKey = `zkkyc_master_${phone}`;
  const phiKey = `zkkyc_phi_${phone}`;
  const base64 = localStorage.getItem(userKey);
  if (!base64) throw new Error(`No master key found for phone ${phone}`);

  const blob = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
  const salt = blob.slice(0, 16);
  const iv = blob.slice(16, 28);
  const encrypted = blob.slice(28);

  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encrypted
    );

    const data = new Uint8Array(decrypted);
    const sk = data.slice(0, 32);
    const r = data.slice(32, 64);
    
    // Load attributes if they exist (72 byte payload), fallback gracefully if old 64 byte payload
    let birthYear = 2000;
    let countryCode = 840; // US
    if (data.length >= 72) {
      const dv = new DataView(data.buffer);
      birthYear = dv.getUint32(64, true);
      countryCode = dv.getUint32(68, true);
    }

    // Verify decryption by checking if the computed identity matches the stored fingerprint
    const storedPhi = localStorage.getItem(phiKey);
    if (storedPhi) {
      const computedPhi = await computeMasterIdentity(sk, r, birthYear, countryCode);
      if (computedPhi !== storedPhi) {
        throw new Error('Key mismatch'); // Correct password, but wrong user profile
      }
    }

    return { sk, r, birthYear, countryCode };
  } catch (e: any) {
    if (e.message === 'Key mismatch') throw new Error('Incorrect password or corrupted profile');
    throw new Error('Incorrect password');
  }
}

/**
 * Hashes a phone number for use as a database key.
 */
export async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts the identity material for cloud backup using the master password.
 */
export async function encryptForBackup(password: string, material: MasterKeyMaterial): Promise<{ encrypted_data: string; iv: string; salt: string }> {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 1. Derive key
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000, // Slightly higher for cloud backup
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // 2. Prepare payload
  const payload = JSON.stringify({
    sk: Buffer.from(material.sk).toString('hex'),
    r: Buffer.from(material.r).toString('hex'),
    birthYear: material.birthYear,
    countryCode: material.countryCode
  });

  // 3. Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(payload)
  );

  return {
    encrypted_data: Buffer.from(encrypted).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    salt: Buffer.from(salt).toString('base64')
  };
}

/**
 * Decrypts identity material from a cloud backup blob.
 */
export async function decryptFromBackup(password: string, encrypted_data: string, iv_base64: string, salt_base64: string): Promise<MasterKeyMaterial> {
  const encoder = new TextEncoder();
  const salt = new Uint8Array(Buffer.from(salt_base64, 'base64'));
  const iv = new Uint8Array(Buffer.from(iv_base64, 'base64'));
  const encrypted = new Uint8Array(Buffer.from(encrypted_data, 'base64'));

  // 1. Derive key
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 150000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encrypted
  );

  const payload = JSON.parse(new TextDecoder().decode(decrypted));
  return {
    sk: new Uint8Array(Buffer.from(payload.sk, 'hex')),
    r: new Uint8Array(Buffer.from(payload.r, 'hex')),
    birthYear: payload.birthYear,
    countryCode: payload.countryCode
  };
}

/**
 * Exports the key as a downloadable JSON file.
 */
export function exportKeyFile(sk: Uint8Array, r: Uint8Array) {
  const data = JSON.stringify({
    sk: Buffer.from(sk).toString('hex'),
    r: Buffer.from(r).toString('hex')
  });
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zkkyc_backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

