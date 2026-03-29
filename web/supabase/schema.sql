-- Identities table: Stores commitments from add_identity events
CREATE TABLE IF NOT EXISTS identities (
    id BIGSERIAL PRIMARY KEY,
    commitment TEXT NOT NULL UNIQUE, -- The identity hex string (phi)
    wallet_address TEXT,             -- Stellar wallet address (for dedup)
    phone_hash TEXT UNIQUE,          -- SHA-256 hash of phone number (for dedup)
    ledger_sequence BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registrations table: Stores used nullifiers per service to prevent double-registration
CREATE TABLE IF NOT EXISTS registrations (
    id BIGSERIAL PRIMARY KEY,
    service_id TEXT NOT NULL,
    nullifier TEXT NOT NULL,
    pseudonym TEXT NOT NULL,
    transaction_hash TEXT, -- Optional, if registered on-chain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, nullifier)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_identities_commitment ON identities(commitment);
CREATE INDEX IF NOT EXISTS idx_registrations_nullifier ON registrations(service_id, nullifier);
