/**
 * poseidon.js — Poseidon hash wrapper matching the circom circuit.
 *
 * All values are BigInts in the BN128 scalar field.
 */
import { buildPoseidon } from "circomlibjs";

let _poseidon = null;

/**
 * Initialize and cache the Poseidon hash instance.
 * Must be called (or awaited) before using hash functions.
 */
export async function initPoseidon() {
  if (!_poseidon) {
    _poseidon = await buildPoseidon();
  }
  return _poseidon;
}

/**
 * Get the raw poseidon instance (must call initPoseidon first).
 */
export function getPoseidon() {
  if (!_poseidon) throw new Error("Call initPoseidon() first");
  return _poseidon;
}

/**
 * Hash an array of BigInt inputs using Poseidon → BigInt output.
 * @param {BigInt[]} inputs  - array of field elements
 * @returns {BigInt}         - hash output as BigInt
 */
export function poseidonHash(inputs) {
  const poseidon = getPoseidon();
  const raw = poseidon(inputs.map((x) => BigInt(x)));
  return poseidon.F.toObject(raw);
}

/**
 * Hash exactly 2 inputs (convenience).
 */
export function poseidon2(a, b) {
  return poseidonHash([BigInt(a), BigInt(b)]);
}

/**
 * Hash exactly 3 inputs (convenience).
 */
export function poseidon3(a, b, c) {
  return poseidonHash([BigInt(a), BigInt(b), BigInt(c)]);
}
