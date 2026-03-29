/**
 * prover.js — Groth16 proof generation wrapper.
 */
import * as snarkjs from "snarkjs";
import { buildMerkleTree, getMerkleProof } from "./merkle.js";
import { deriveNullifier, derivePseudonym } from "./identity.js";

/**
 * Generate a Groth16 ZK proof for the zkKYC circuit.
 *
 * @param {Object}   params
 * @param {BigInt}   params.sk          - master secret key
 * @param {BigInt}   params.r           - master randomness
 * @param {BigInt}   params.serviceId   - service identifier (field element)
 * @param {BigInt[]} params.allLeaves   - all identity commitments (anonymity set)
 * @param {number}   params.myIndex     - index of this identity in allLeaves
 * @param {string}   params.wasmPath    - path to compiled circuit WASM
 * @param {string}   params.zkeyPath    - path to proving key
 *
 * @returns {{ proof: Object, publicSignals: string[], nullifier: BigInt, pseudonym: BigInt, merkleRoot: BigInt }}
 */
export async function generateProof({
  sk,
  r,
  serviceId,
  allLeaves,
  myIndex,
  wasmPath,
  zkeyPath,
}) {
  sk = BigInt(sk);
  r = BigInt(r);
  serviceId = BigInt(serviceId);

  // Build Merkle tree and get proof
  const { tree, root: merkleRoot } = buildMerkleTree(allLeaves);
  const { pathElements, pathIndices } = getMerkleProof(tree, myIndex);

  // Derive nullifier and pseudonym
  const nullifier = deriveNullifier(sk, serviceId);
  const pseudonym = derivePseudonym(sk, r, serviceId);

  // Circuit input
  const input = {
    // Private
    sk: sk.toString(),
    r: r.toString(),
    pathElements: pathElements.map((e) => e.toString()),
    pathIndices: pathIndices.map((e) => e.toString()),
    // Public
    merkleRoot: merkleRoot.toString(),
    nullifier: nullifier.toString(),
    pseudonym: pseudonym.toString(),
    serviceId: serviceId.toString(),
  };

  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    wasmPath,
    zkeyPath
  );

  return {
    proof,
    publicSignals,
    nullifier,
    pseudonym,
    merkleRoot,
  };
}
