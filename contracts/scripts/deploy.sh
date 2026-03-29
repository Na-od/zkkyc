#!/bin/bash

# Exit on any error
set -e

echo "=== zkKYC Soroban Contract Deployment ==="

# 0. Add WebAssembly Target
echo "[0/4] Installing WebAssembly target for Rust..."
rustup target add wasm32-unknown-unknown

# 1. Build the contract
echo "[1/4] Building the smart contract to WebAssembly..."
# Use a linux-native target directory to bypass WSL file locking errors on /mnt/c
export CARGO_TARGET_DIR=~/.cargo-target/zkkyc
cargo build \
    --target wasm32-unknown-unknown \
    --release
echo "✓ Contract built successfully."

# Setup paths for deployment
WASM_PATH="${CARGO_TARGET_DIR}/wasm32-unknown-unknown/release/zkcredential_idr.wasm"

# 2. Add Testnet network config (if not already added)
echo "[2/4] Configuring Stellar Testnet..."
stellar network add \
    testnet \
    --rpc-url https://soroban-testnet.stellar.org:443 \
    --network-passphrase "Test SDF Network ; September 2015" || true

# 3. Create and fund an admin identity on Testnet
echo "[3/4] Creating 'zkkyc-admin' keypair and funding it on Testnet..."
stellar keys generate \
    zkkyc-admin \
    --network testnet \
    --fund || true
echo "✓ Admin keypair ready."

# Print the secret key so the user can add it to their server/.env
echo ""
echo "=================================================="
echo "⚠️  IMPORTANT: SAVE THIS SECRET KEY FOR server/.env"
echo "=================================================="
stellar keys secret zkkyc-admin
echo "=================================================="
echo ""

# 4. Deploy the contract
echo "[4/4] Deploying contract to Testnet..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm "$WASM_PATH" \
    --source zkkyc-admin \
    --network testnet)

echo "✓ Contract deployed successfully!"
echo ""
echo "=================================================="
echo "🚀 CONTRACT ID: $CONTRACT_ID"
echo "=================================================="
echo "Add this Contract ID to your server/.env file as SOROBAN_CONTRACT_ID"
