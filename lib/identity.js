/**
 * identity.js — Master identity and pseudonym/nullifier generation.
 *
 * All operations use Poseidon hashing to match the circom circuit.
 */
import crypto from "crypto";
import { poseidon2, poseidon3 } from "./poseidon.js";

/**
 * Generate a random field element (< BN128 scalar field order).
 * @returns {BigInt}
 */
export function randomFieldElement() {
  const buf = crypto.randomBytes(31);
  return BigInt("0x" + buf.toString("hex"));
}

/**
 * Create a new master identity.
 *
 * @returns {{ sk: BigInt, r: BigInt, id: BigInt }}
 *   sk  – master secret key (private)
 *   r   – master randomness (private)
 *   id  – public identity commitment = Poseidon(sk, r)
 */
export function createMasterIdentity() {
  const sk = randomFieldElement();
  const r = randomFieldElement();
  const id = poseidon2(sk, r);
  return { sk, r, id };
}

/**
 * Derive the nullifier for a given service.
 * nullifier = Poseidon(sk, serviceId)
 *
 * Deterministic per (identity, service) → used for Sybil resistance.
 *
 * @param {BigInt} sk        - master secret key
 * @param {BigInt} serviceId - service identifier (as field element)
 * @returns {BigInt}
 */
export function deriveNullifier(sk, serviceId) {
  return poseidon2(sk, BigInt(serviceId));
}

/**
 * Derive the pseudonym for a given service.
 * pseudonym = Poseidon(sk, r, serviceId)
 *
 * Unique per (identity, service) and unlinkable across services.
 *
 * @param {BigInt} sk        - master secret key
 * @param {BigInt} r         - master randomness
 * @param {BigInt} serviceId - service identifier (as field element)
 * @returns {BigInt}
 */
export function derivePseudonym(sk, r, serviceId) {
  return poseidon3(sk, r, BigInt(serviceId));
}

/**
 * Convert a human-readable service name to a field element.
 * Uses SHA-256 truncated to 31 bytes to fit in BN128 field.
 *
 * @param {string} name - e.g. "example-service.com"
 * @returns {BigInt}
 */
export function serviceNameToId(name) {
  const hash = crypto.createHash("sha256").update(name).digest();
  // Take first 31 bytes to ensure < field order
  return BigInt("0x" + hash.subarray(0, 31).toString("hex"));
}

/**
 * Serialize a master identity to a JSON-safe object.
 */
export function serializeIdentity(identity) {
  return {
    sk: identity.sk.toString(),
    r: identity.r.toString(),
    id: identity.id.toString(),
  };
}

/**
 * Deserialize a master identity from its JSON representation.
 */
export function deserializeIdentity(obj) {
  return {
    sk: BigInt(obj.sk),
    r: BigInt(obj.r),
    id: BigInt(obj.id),
  };
}
