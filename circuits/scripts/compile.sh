#!/usr/bin/env bash
# ──────────────────────────────────────────────
# Compile the zkKYC circom circuit
# Run from the circuits/ directory:
#   bash scripts/compile.sh
# ──────────────────────────────────────────────
set -euo pipefail

CIRCUIT_NAME="zkkyc"
BUILD_DIR="build"

echo "══════════════════════════════════════════"
echo " Compiling ${CIRCUIT_NAME}.circom"
echo "══════════════════════════════════════════"

mkdir -p "${BUILD_DIR}"

# Compile the circuit → R1CS + WASM witness generator + symbols
circom "${CIRCUIT_NAME}.circom" \
    --r1cs \
    --wasm \
    --sym \
    --output "${BUILD_DIR}" \
    -l node_modules

echo ""
echo "✓ Compilation complete!"
echo "  R1CS:    ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs"
echo "  WASM:    ${BUILD_DIR}/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo "  Symbols: ${BUILD_DIR}/${CIRCUIT_NAME}.sym"

# Print constraint info
echo ""
npx snarkjs r1cs info "${BUILD_DIR}/${CIRCUIT_NAME}.r1cs"
