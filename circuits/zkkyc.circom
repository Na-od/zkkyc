pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
/// ──────────────────────────────────────────────────────────────
/// MerkleProof(levels)
///   Given a leaf and a Merkle authentication path, computes the
///   root using Poseidon(2) at each level.
///   pathIndices[i] == 0  ⇒  hash(current, sibling)
///   pathIndices[i] == 1  ⇒  hash(sibling, current)
/// ──────────────────────────────────────────────────────────────
template MerkleProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    signal hashes[levels + 1];
    hashes[0] <== leaf;

    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        // pathIndices must be binary
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        hashers[i] = Poseidon(2);

        // When pathIndices[i]==0: left=current, right=sibling
        // When pathIndices[i]==1: left=sibling, right=current
        hashers[i].inputs[0] <== hashes[i]
            + pathIndices[i] * (pathElements[i] - hashes[i]);
        hashers[i].inputs[1] <== pathElements[i]
            + pathIndices[i] * (hashes[i] - pathElements[i]);

        hashes[i + 1] <== hashers[i].out;
    }

    root <== hashes[levels];
}

/// ──────────────────────────────────────────────────────────────
/// ZkKYC(levels)
///   Main circuit for the zkKYC credential system.
///
///   Private witness:
///     sk            – master secret key
///     r             – master randomness
///     pathElements  – Merkle siblings
///     pathIndices   – Merkle path directions (0/1)
///
///   Public signals:
///     merkleRoot    – root of the identity Merkle tree
///     nullifier     – Poseidon(sk, serviceId)
///     pseudonym     – Poseidon(sk, r, serviceId)
///     serviceId     – identifier of the service provider
///
///   Constraints:
///     1. leaf = Poseidon(sk, r)
///     2. Merkle proof verifies leaf ∈ tree(merkleRoot)
///     3. nullifier == Poseidon(sk, serviceId)
///     4. pseudonym == Poseidon(sk, r, serviceId)
/// ──────────────────────────────────────────────────────────────
template ZkKYC(levels) {
    // ── Private inputs ──
    signal input sk;
    signal input r;
    signal input birthYear;
    signal input countryCode;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // ── Public inputs ──
    signal input merkleRoot;
    signal input nullifier;
    signal input pseudonym;
    signal input serviceId;
    signal input currentYear;
    signal input minAge;

    // ── 1. Compute the identity leaf ──
    component leafHash = Poseidon(4);
    leafHash.inputs[0] <== sk;
    leafHash.inputs[1] <== r;
    leafHash.inputs[2] <== birthYear;
    leafHash.inputs[3] <== countryCode;

    // ── 2. Verify Merkle membership ──
    component merkle = MerkleProof(levels);
    merkle.leaf <== leafHash.out;
    for (var i = 0; i < levels; i++) {
        merkle.pathElements[i] <== pathElements[i];
        merkle.pathIndices[i]  <== pathIndices[i];
    }
    merkle.root === merkleRoot;

    // ── 3. Verify nullifier correctness ──
    //    nullifier = Poseidon(sk, serviceId)
    //    Deterministic per (identity, service) → Sybil resistance
    component nullHash = Poseidon(2);
    nullHash.inputs[0] <== sk;
    nullHash.inputs[1] <== serviceId;
    nullHash.out === nullifier;

    // ── 4. Verify pseudonym correctness ──
    //    pseudonym = Poseidon(sk, r, serviceId)
    //    Unique per (identity, service) and unlinkable across services
    component pseudoHash = Poseidon(3);
    pseudoHash.inputs[0] <== sk;
    pseudoHash.inputs[1] <== r;
    pseudoHash.inputs[2] <== serviceId;
    pseudoHash.out === pseudonym;

    // ── 5. Selective Disclosure: Age Verification ──
    // Prove that the user's birthYear + minAge <= currentYear
    // Without revealing the actual birthYear!
    component ageCheck = LessEqThan(32); // 32-bit comparator is plenty for years
    ageCheck.in[0] <== birthYear + minAge;
    ageCheck.in[1] <== currentYear;
    ageCheck.out === 1;
}

// Instantiate with depth 8 → supports up to 256 identities
component main {public [merkleRoot, nullifier, pseudonym, serviceId, currentYear, minAge]} = ZkKYC(8);
