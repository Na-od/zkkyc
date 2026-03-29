/**
 * lib/index.js — Re-export everything from the zkKYC library.
 */
export { initPoseidon, poseidonHash, poseidon2, poseidon3 } from "./poseidon.js";
export { buildMerkleTree, getMerkleProof } from "./merkle.js";
export {
  randomFieldElement,
  createMasterIdentity,
  deriveNullifier,
  derivePseudonym,
  serviceNameToId,
  serializeIdentity,
  deserializeIdentity,
} from "./identity.js";
export { generateProof } from "./prover.js";
export { verifyProof, parsePublicSignals } from "./verifier.js";
