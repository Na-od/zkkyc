import { buildPoseidon } from 'circomlibjs';

/**
 * Computes a nullifier = Poseidon(sk, serviceId)
 * This ensures a user can only register once per service.
 */
export async function computeNullifier(sk: Uint8Array, serviceId: string): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  // Convert inputs to BigInt
  const skBI = BigInt('0x' + Buffer.from(sk).toString('hex'));
  
  // serviceId can be treated as a number or hex string
  // If it's a string name, we should hash it first to fit in field
  const encodedService = BigInt('0x' + Buffer.from(serviceId, 'utf8').toString('hex'));
  const serviceIdBI = F.toObject(poseidon([encodedService]));

  const hash = poseidon([skBI, serviceIdBI]);
  
  // Return hex string (32 bytes / 64 chars)
  return F.toObject(hash).toString(16).padStart(64, '0');
}

/**
 * Converts a nullifier BigInt/Uint8Array to hex string.
 */
export function nullifierToHex(nullifier: Uint8Array): string {
  return Buffer.from(nullifier).toString('hex');
}

/**
 * Converts a hex string back to Uint8Array.
 */
export function hexToNullifier(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}
