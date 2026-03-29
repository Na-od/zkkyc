#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Trusted setup for zkKYC Groth16
# Run from the circuits/ directory:
#   bash scripts/setup.sh
# ──────────────────────────────────────────────
set -euo pipefail

CIRCUIT_NAME="zkkyc"
BUILD_DIR="build"
KEYS_DIR="keys"

echo "══════════════════════════════════════════"
echo " Groth16 Trusted Setup for ${CIRCUIT_NAME}"
echo "══════════════════════════════════════════"

mkdir -p "${KEYS_DIR}"

# ── Phase 1: Powers of Tau (universal) ──
echo ""
echo "[1/5] Starting Powers of Tau ceremony (2^14)..."
npx snarkjs powersoftau new bn128 14 "${KEYS_DIR}/pot14_0000.ptau" -v

echo ""
echo "[2/5] Contributing to ceremony..."
npx snarkjs powersoftau contribute \
    "${KEYS_DIR}/pot14_0000.ptau" \
    "${KEYS_DIR}/pot14_0001.ptau" \
    --name="zkKYC hackathon setup" -v -e="random entropy for hackathon demo"

echo ""
echo "[3/5] Preparing phase 2..."
npx snarkjs powersoftau prepare phase2 \
    "${KEYS_DIR}/pot14_0001.ptau" \
    "${KEYS_DIR}/pot14_final.ptau" -v

# ── Phase 2: Circuit-specific setup ──
echo ""
echo "[4/5] Generating proving key (zkey)..."
npx snarkjs groth16 setup \
    "${BUILD_DIR}/${CIRCUIT_NAME}.r1cs" \
    "${KEYS_DIR}/pot14_final.ptau" \
    "${KEYS_DIR}/${CIRCUIT_NAME}_0000.zkey"

# Contribute to phase 2
npx snarkjs zkey contribute \
    "${KEYS_DIR}/${CIRCUIT_NAME}_0000.zkey" \
    "${KEYS_DIR}/${CIRCUIT_NAME}.zkey" \
    --name="zkKYC contributor" -v -e="more random entropy"

echo ""
echo "[5/5] Exporting verification key..."
npx snarkjs zkey export verificationkey \
    "${KEYS_DIR}/${CIRCUIT_NAME}.zkey" \
    "${KEYS_DIR}/verification_key.json"

echo ""
echo "══════════════════════════════════════════"
echo " ✓ Setup complete!"
echo "   Proving key:      ${KEYS_DIR}/${CIRCUIT_NAME}.zkey"
echo "   Verification key: ${KEYS_DIR}/verification_key.json"
echo "══════════════════════════════════════════"

# Clean up intermediate files
rm -f "${KEYS_DIR}/pot14_0000.ptau" "${KEYS_DIR}/pot14_0001.ptau" "${KEYS_DIR}/${CIRCUIT_NAME}_0000.zkey"
echo "  (cleaned up intermediate ceremony files)"
