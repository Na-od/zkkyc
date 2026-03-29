pragma circom 2.1.0;

include "../web/node_modules/circomlib/circuits/poseidon.circom";
include "../web/node_modules/circomlib/circuits/mux1.circom";

// -------------------------------------------------------
// MerkleTreeInclusionProof
// Proves a leaf is in a Merkle tree of depth D
// without revealing leaf position
// -------------------------------------------------------
template MerkleTreeInclusionProof(D) {
    signal input leaf;
    signal input pathElements[D];   // sibling hashes along the path
    signal input pathIndices[D];    // 0 = go left, 1 = go right (private)
    signal output root;

    component hashers[D];
    component mux[D];

    signal currentHash[D + 1];
    currentHash[0] <== leaf;

    for (var i = 0; i < D; i++) {
        // pathIndices[i] * (1 - pathIndices[i]) === 0; // must be 0 or 1

        mux[i] = MultiMux1(2);
        mux[i].c[0][0] <== currentHash[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== currentHash[i];
        mux[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];
        currentHash[i + 1] <== hashers[i].out;
    }

    root <== currentHash[D];
}

// -------------------------------------------------------
// zkKYC Membership Proof
// D = Merkle tree depth (D=4 -> 16 members)
// -------------------------------------------------------
template MembershipProof(D) {

    // -- PRIVATE INPUTS --
    signal input sk;                    // master secret key
    signal input r;                     // random blinding factor
    signal input pathElements[D];       // Merkle paths
    signal input pathIndices[D];        // Merkle path directions

    // -- PUBLIC INPUTS --
    signal input merkleRoot;            // Merkle root of anonymity set
    signal input serviceId;             // Poseidon("service-name")
    signal input nullifier;             // Poseidon(sk, serviceId)
    signal input pseudonymCommitment;   // Poseidon(Poseidon(sk, r), serviceId)

    // 1. Derive master identity from sk
    component identityHasher = Poseidon(1);
    identityHasher.inputs[0] <== sk;
    signal masterIdentity <== identityHasher.out;

    // 2. Verify master identity is in Merkle tree
    component merkleProof = MerkleTreeInclusionProof(D);
    merkleProof.leaf <== masterIdentity;
    for (var i = 0; i < D; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i]  <== pathIndices[i];
    }
    merkleRoot === merkleProof.root;

    // 3. Verify nullifier
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== sk;
    nullifierHasher.inputs[1] <== serviceId;
    nullifier === nullifierHasher.out;

    // 4. Verify pseudonym commitment
    component childKeyHasher = Poseidon(2);
    childKeyHasher.inputs[0] <== sk;
    childKeyHasher.inputs[1] <== r;
    signal childKey <== childKeyHasher.out;

    component pseudonymHasher = Poseidon(2);
    pseudonymHasher.inputs[0] <== childKey;
    pseudonymHasher.inputs[1] <== serviceId;
    pseudonymCommitment === pseudonymHasher.out;
}

component main { public [merkleRoot, serviceId, nullifier, pseudonymCommitment] } = MembershipProof(4);
