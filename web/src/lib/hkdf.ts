/**
 * Derives a service-specific child key from the master randomness r.
 */
export async function deriveChildKey(r: Uint8Array, serviceName: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    r as BufferSource,
    'HKDF',
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(serviceName),
      info: encoder.encode('zkkyc-child-key') // context
    },
    baseKey,
    256 // 32 bytes
  );

  return new Uint8Array(derivedBits);
}

/**
 * Derives multiple child keys for a list of services.
 */
export async function deriveMultipleChildKeys(r: Uint8Array, serviceNames: string[]): Promise<Map<string, Uint8Array>> {
  const results = new Map<string, Uint8Array>();
  for (const name of serviceNames) {
    const childKey = await deriveChildKey(r, name);
    results.set(name, childKey);
  }
  return results;
}
