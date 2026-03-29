/**
 * verifier.js — Groth16 proof verification wrapper.
 */
import * as snarkjs from "snarkjs";
import fs from "fs";

/**
 * Verify a Groth16 proof.
 *
 * @param {Object}   proof          - the Groth16 proof object
 * @param {string[]} publicSignals  - array of public signal strings
 * @param {Object|string} vkey      - verification key (object or path to JSON file)
 * @returns {boolean} true if the proof is valid
 */
export async function verifyProof(proof, publicSignals, vkey) {
  let vkeyObj = vkey;
  if (typeof vkey === "string") {
    vkeyObj = JSON.parse(fs.readFileSync(vkey, "utf-8"));
  }

  return snarkjs.groth16.verify(vkeyObj, publicSignals, proof);
}

/**
 * Extract the public signals from a verified proof in named form.
 *
 * The circuit's public signals order (from the main component declaration):
 *   [merkleRoot, nullifier, pseudonym, serviceId]
 *
 * @param {string[]} publicSignals - raw public signals array
 * @returns {{ merkleRoot: BigInt, nullifier: BigInt, pseudonym: BigInt, serviceId: BigInt }}
 */
export function parsePublicSignals(publicSignals) {
  return {
    merkleRoot: BigInt(publicSignals[0]),
    nullifier: BigInt(publicSignals[1]),
    pseudonym: BigInt(publicSignals[2]),
    serviceId: BigInt(publicSignals[3]),
  };
}
