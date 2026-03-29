/**
 * test_proof.js — End-to-end test for the zkKYC circuit.
 *
 * Run from circuits/ after compile.sh and setup.sh:
 *   node scripts/test_proof.js
 */
import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, "..", "build");
const KEYS_DIR = path.join(__dirname, "..", "keys");

const LEVELS = 8;
const TREE_SIZE = 1 << LEVELS; // 256

// ── Helpers ──

function randomFieldElement() {
  // BN128 scalar field: p ≈ 2^254
  // Generate a random 31-byte value (< p)
  const buf = crypto.randomBytes(31);
  return BigInt("0x" + buf.toString("hex"));
}

function F(poseidon, val) {
  return poseidon.F.toObject(val);
}

// ── Merkle tree (Poseidon-based, matching circuit) ──

function buildMerkleTree(poseidon, leaves) {
  const tree = [leaves.slice()];
  // Pad to full size with zeros
  while (tree[0].length < TREE_SIZE) {
    tree[0].push(0n);
  }

  let currentLevel = tree[0];
  for (let i = 0; i < LEVELS; i++) {
    const nextLevel = [];
    for (let j = 0; j < currentLevel.length; j += 2) {
      const left = currentLevel[j];
      const right = currentLevel[j + 1] ?? 0n;
      const hash = F(poseidon, poseidon([left, right]));
      nextLevel.push(hash);
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return tree;
}

function getMerkleProof(tree, index) {
  const pathElements = [];
  const pathIndices = [];
  let idx = index;

  for (let i = 0; i < LEVELS; i++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    pathElements.push(tree[i][siblingIdx] ?? 0n);
    pathIndices.push(idx % 2);
    idx = Math.floor(idx / 2);
  }

  return { pathElements, pathIndices };
}

// ── Main test ──

async function main() {
  console.log("══════════════════════════════════════════");
  console.log(" zkKYC Circuit — End-to-End Test");
  console.log("══════════════════════════════════════════\n");

  // 1. Initialize Poseidon
  console.log("[1] Initializing Poseidon hash...");
  const poseidon = await buildPoseidon();

  // 2. Generate test identities
  console.log("[2] Generating 4 test identities...");
  const identities = [];
  for (let i = 0; i < 4; i++) {
    const sk = randomFieldElement();
    const r = randomFieldElement();
    const id = F(poseidon, poseidon([sk, r]));
    identities.push({ sk, r, id });
    console.log(`    Identity ${i}: id = ${id.toString(16).slice(0, 16)}...`);
  }

  // 3. Build Merkle tree
  console.log("[3] Building Merkle tree (depth=8, 256 leaves)...");
  const leaves = identities.map((id) => id.id);
  const tree = buildMerkleTree(poseidon, leaves);
  const merkleRoot = tree[LEVELS][0];
  console.log(`    Root: ${merkleRoot.toString(16).slice(0, 16)}...`);

  // 4. Pick identity 0 to generate a proof for
  const proverIndex = 0;
  const prover = identities[proverIndex];
  const serviceId = BigInt(
    "0x" +
      Buffer.from("example-service.com").toString("hex")
  );

  console.log(`[4] Prover index=${proverIndex}, service='example-service.com'`);

  // 5. Compute expected public signals
  const expectedNullifier = F(poseidon, poseidon([prover.sk, serviceId]));
  const expectedPseudonym = F(
    poseidon,
    poseidon([prover.sk, prover.r, serviceId])
  );
  console.log(
    `    Nullifier:  ${expectedNullifier.toString(16).slice(0, 16)}...`
  );
  console.log(
    `    Pseudonym:  ${expectedPseudonym.toString(16).slice(0, 16)}...`
  );

  // 6. Build Merkle proof
  const { pathElements, pathIndices } = getMerkleProof(tree, proverIndex);

  // 7. Construct the circuit input
  const circuitInput = {
    // Private
    sk: prover.sk.toString(),
    r: prover.r.toString(),
    pathElements: pathElements.map((e) => e.toString()),
    pathIndices: pathIndices.map((e) => e.toString()),
    // Public
    merkleRoot: merkleRoot.toString(),
    nullifier: expectedNullifier.toString(),
    pseudonym: expectedPseudonym.toString(),
    serviceId: serviceId.toString(),
  };

  // 8. Generate proof
  console.log("[5] Generating Groth16 proof...");
  const wasmPath = path.join(BUILD_DIR, "zkkyc_js", "zkkyc.wasm");
  const zkeyPath = path.join(KEYS_DIR, "zkkyc.zkey");

  const startTime = Date.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInput,
    wasmPath,
    zkeyPath
  );
  const proofTime = Date.now() - startTime;
  console.log(`    ✓ Proof generated in ${proofTime}ms`);
  console.log(`    Public signals: [${publicSignals.map(s => s.slice(0, 12) + "...").join(", ")}]`);

  // 9. Verify proof
  console.log("[6] Verifying proof...");
  const vkeyPath = path.join(KEYS_DIR, "verification_key.json");
  const vkeyJson = (await import(vkeyPath, { assert: { type: "json" } }))
    .default;

  const valid = await snarkjs.groth16.verify(vkeyJson, publicSignals, proof);

  if (valid) {
    console.log("\n══════════════════════════════════════════");
    console.log(" ✓ PROOF VERIFIED SUCCESSFULLY");
    console.log("══════════════════════════════════════════");
  } else {
    console.error("\n✗ PROOF VERIFICATION FAILED");
    process.exit(1);
  }

  // 10. Test: Tampered proof should fail
  console.log("\n[7] Testing tampered proof (should fail)...");
  const tamperedSignals = [...publicSignals];
  tamperedSignals[0] = "123456789"; // bad merkleRoot
  const validTampered = await snarkjs.groth16.verify(
    vkeyJson,
    tamperedSignals,
    proof
  );
  if (!validTampered) {
    console.log("    ✓ Tampered proof correctly rejected");
  } else {
    console.error("    ✗ Tampered proof was accepted (BAD!)");
    process.exit(1);
  }

  console.log("\n✓ All tests passed!\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
