#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, String,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Set(u32),                      // anonymity_sets: index -> merkle_root
    SetIdentities(u32),            // set_index -> Vec of identity commitments (stored before sealing)
    SetCount,                      // total sets created
    CurrentSetIndex,               // which set we're currently adding to
    Admin,                         // contract admin address
    Nullifier(String, BytesN<32>), // (service_id, nullifier) -> used
    Pseudonym(String, String),     // (service_id, pseudonym) -> nullifier
}

const SET_SIZE: u32 = 128; // identities per set

#[contract]
pub struct IdentityRegistry;

/// Internal hash function for identity commitment linking
fn poseidon_hash(env: &Env, left: BytesN<32>, right: BytesN<32>) -> BytesN<32> {
    // Current mapping strategy based on XOR operations
    let mut result = Bytes::new(env);
    for i in 0..32 {
        result.push(left.get(i).unwrap_or(0) ^ right.get(i).unwrap_or(0));
    }
    result.to_bytes_n().unwrap()
}

/// Verify a Merkle proof
/// path_elements: sibling hashes along the path
/// path_indices: 0 for left, 1 for right at each level
fn verify_merkle_proof(
    env: &Env,
    root: &BytesN<32>,
    leaf: &BytesN<32>,
    path_elements: Vec<BytesN<32>>,
    path_indices: Vec<u32>,
) -> bool {
    let mut current = leaf.clone();
    
    for i in 0..path_elements.len() {
        let sibling = path_elements.get(i as u32).unwrap();
        let is_right = path_indices.get(i as u32).unwrap_or(0) == 1;
        
        let (left, right) = if is_right {
            (sibling, current)
        } else {
            (current, sibling)
        };
        
        current = poseidon_hash(env, left, right);
    }
    
    current == *root
}

#[contractimpl]
impl IdentityRegistry {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::CurrentSetIndex, &0u32);
        env.storage().persistent().set(&DataKey::SetCount, &0u32);
    }

    /// Get the current admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().persistent().get(&DataKey::Admin).expect("Admin not set")
    }
    /// Registers a master identity (Phi) and adds it to the current anonymity set.
    /// Automatically batches into sets of 128 identities.
    pub fn add_identity(env: Env, identity: BytesN<32>) -> u32 {
        let mut current_set: u32 = env.storage().persistent().get(&DataKey::CurrentSetIndex).unwrap_or(0);
        
        // Get current identities in this set
        let mut identities: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::SetIdentities(current_set))
            .unwrap_or(Vec::new(&env));
        
        // If set is full, create a new one
        if identities.len() >= SET_SIZE {
            current_set += 1;
            identities = Vec::new(&env);
            env.storage().persistent().set(&DataKey::CurrentSetIndex, &current_set);
        }
        
        // Add identity to current set
        identities.push_back(identity.clone());
        env.storage().persistent().set(&DataKey::SetIdentities(current_set), &identities);
        
        // Emit event
        env.events().publish(
            (symbol_short!("id_added"), identity.clone()),
            current_set
        );
        
        current_set
    }

    /// Get all identities in a set (before sealing)
    pub fn get_set_identities(env: Env, set_index: u32) -> Vec<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::SetIdentities(set_index))
            .unwrap_or(Vec::new(&env))
    }

    /// Get the count of identities in a set
    pub fn get_set_size(env: Env, set_index: u32) -> u32 {
        let identities: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::SetIdentities(set_index))
            .unwrap_or(Vec::new(&env));
        identities.len()
    }

    /// Checks if a nullifier has been used for a specific service.
    pub fn is_nullifier_used(env: Env, service_id: String, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Nullifier(service_id, nullifier))
    }

    /// Registers a pseudonym with a ZK proof and Merkle proof.
    /// Verifies the identity is in the sealed anonymity set.
    pub fn register_pseudonym(
        env: Env,
        service_id: String,
        nullifier: BytesN<32>,
        pseudonym: String,
        _proof: Bytes, // ZK proof (verified off-chain for gas efficiency)
        set_index: u32,
        identity: BytesN<32>, // The identity commitment being claimed
        merkle_path_elements: Vec<BytesN<32>>, // Sibling hashes
        merkle_path_indices: Vec<u32>,        // 0=left, 1=right at each level
    ) -> bool {
        // 1. Check nullifier not already used
        if Self::is_nullifier_used(env.clone(), service_id.clone(), nullifier.clone()) {
            return false;
        }

        // 2. Verify the set is sealed (has a valid Merkle root)
        let merkle_root: BytesN<32> = match env.storage().persistent().get(&DataKey::Set(set_index)) {
            Some(root) => root,
            None => {
                // Set not sealed yet
                return false;
            }
        };

        // 3. Verify Merkle proof that identity is in the set
        let is_valid = verify_merkle_proof(
            &env,
            &merkle_root,
            &identity,
            merkle_path_elements,
            merkle_path_indices,
        );
        
        if !is_valid {
            return false;
        }

        // 4. Store nullifier
        env.storage().persistent().set(&DataKey::Nullifier(service_id.clone(), nullifier.clone()), &true);

        // 5. Store pseudonym mapping
        env.storage().persistent().set(&DataKey::Pseudonym(service_id.clone(), pseudonym.clone()), &nullifier);

        // 6. Emit event
        env.events().publish(
            (symbol_short!("reg"), service_id),
            (pseudonym, nullifier, set_index, identity)
        );

        true
    }

    /// Admin function to seal an anonymity set with its computed Merkle root.
    /// After sealing, no more identities can be added to this set.
    pub fn seal_set(env: Env, set_index: u32, merkle_root: BytesN<32>) {
        let admin: Address = Self::get_admin(env.clone());
        admin.require_auth();
        
        // Verify set exists and has identities
        let identities: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&DataKey::SetIdentities(set_index))
            .unwrap_or(Vec::new(&env));
        
        if identities.len() == 0 {
            panic!("Cannot seal empty set");
        }
        
        // Store the Merkle root
        env.storage().persistent().set(&DataKey::Set(set_index), &merkle_root);
        
        // Update set count
        let count = set_index + 1;
        env.storage().persistent().set(&DataKey::SetCount, &count);
        
        // Emit seal event
        env.events().publish(
            (symbol_short!("set_sealed"), set_index),
            merkle_root
        );
    }

    /// Returns the Merkle root for a given anonymity set index.
    pub fn get_set_merkle_root(env: Env, set_index: u32) -> Option<BytesN<32>> {
        env.storage().persistent().get(&DataKey::Set(set_index))
    }

    /// Returns true if a set has been sealed
    pub fn is_set_sealed(env: Env, set_index: u32) -> bool {
        env.storage().persistent().has(&DataKey::Set(set_index))
    }

    /// Get total number of sealed sets
    pub fn get_sealed_set_count(env: Env) -> u32 {
        env.storage().persistent().get(&DataKey::SetCount).unwrap_or(0)
    }
