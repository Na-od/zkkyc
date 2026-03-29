import { PoseidonMerkleTree, computeServiceId, computePseudonymCommitment } from './merkleTree';
import { computeNullifier } from './nullifier';

const origin = typeof window !== 'undefined' ? window.location.origin : (typeof self !== 'undefined' ? self.location.origin : '');
const TREE_DEPTH = 8;
const WASM_PATH = `${origin}/circuits/zkkyc.wasm`;
const ZKEY_URL = `${origin}/circuits/zkkyc.zkey`;

export interface ZKProofInput {
  sk: Uint8Array;                // master secret key
  r: Uint8Array;                 // blinding factor
  birthYear: number;             // private attribute
  countryCode: number;           // private attribute
  anonymitySet: string[];        // hex identities in set
  myIndex: number;               // index in anonymity set
  serviceName: string;           // e.g. "m-pesa-kenya"
  currentYear: number;           // public signal
  minAge: number;                // public signal
}

export interface ZKProofOutput {
  proof: any;
  publicSignals: string[];
  nullifier: string;
  pseudonymCommitment: string;
  merkleRoot: string;
}

/**
 * Generates a membership ZK proof.
 */
export async function generateMembershipProof(input: ZKProofInput): Promise<ZKProofOutput> {

  // 1. Build Merkle Tree
  const tree = await PoseidonMerkleTree.fromIdentities(input.anonymitySet, TREE_DEPTH);
  const merkleRoot = tree.getRoot();
  const { pathElements, pathIndices } = tree.getProof(input.myIndex);

  // 2. Compute public identities
  const serviceId = await computeServiceId(input.serviceName);
  const nullifier = await computeNullifier(input.sk, input.serviceName);
  
  const skBI = BigInt('0x' + Buffer.from(input.sk).toString('hex'));
  const rBI = BigInt('0x' + Buffer.from(input.r).toString('hex'));
  const pseudonymCommitment = await computePseudonymCommitment(skBI, rBI, serviceId);

  // 3. Prepare circuit inputs
  const circuitInputs = {
    sk: skBI.toString(),
    r: rBI.toString(),
    birthYear: input.birthYear.toString(),
    countryCode: input.countryCode.toString(),
    pathElements: pathElements.map(e => e.toString()),
    pathIndices: pathIndices.map(i => i.toString()),
    merkleRoot: merkleRoot.toString(),
    serviceId: serviceId.toString(),
    nullifier: BigInt('0x' + nullifier).toString(),
    pseudonym: pseudonymCommitment.toString(),
    currentYear: input.currentYear.toString(),
    minAge: input.minAge.toString()
  };

  console.log('[zkKYC] Circuit Inputs:', {
    birthYear: circuitInputs.birthYear,
    minAge: circuitInputs.minAge,
    currentYear: circuitInputs.currentYear,
    expectedTotal: parseInt(circuitInputs.birthYear) + parseInt(circuitInputs.minAge)
  });

  // 4. Run snarkjs proof generation
  // Requires snarkjs to be available in the environment (bundled or global)
  // In a Next.js client, this ideally uses the Web Worker pattern.
  const snarkjs = await import('snarkjs');

  console.log('[zkKYC] Fetching wasm...');
  const wasmRes = await fetch(WASM_PATH);
  const wasmBuffer = await wasmRes.arrayBuffer();

  console.log('[zkKYC] Fetching zkey...');
  const zkeyRes = await fetch(ZKEY_URL);
  const zkeyBuffer = await zkeyRes.arrayBuffer();

  console.log('[zkKYC] Generating proof...');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInputs,
    new Uint8Array(wasmBuffer),
    new Uint8Array(zkeyBuffer)
  );

  return {
    proof,
    publicSignals,
    nullifier: '0x' + nullifier,
    pseudonymCommitment: '0x' + pseudonymCommitment.toString(16).padStart(64, '0'),
    merkleRoot: '0x' + merkleRoot.toString(16).padStart(64, '0')
  };
}

/**
 * Verifies a proof client-side for immediate feedback.
 */
export async function verifyMembershipProof(proof: any, publicSignals: string[]): Promise<boolean> {
  const snarkjs = await import('snarkjs');

  const vKeyRes = await fetch(`${origin}/circuits/verification_key.json`);
  const vKey = await vKeyRes.json();

  return await snarkjs.groth16.verify(vKey, publicSignals, proof);
}
