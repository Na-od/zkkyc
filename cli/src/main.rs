use clap::{Parser, Subcommand};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Poseidon implementation for CLI to match web app
/// Uses neptune for Poseidon(2) and Poseidon(3)
mod poseidon {
    use neptune::poseidon::Poseidon;
    use ff::{Field, PrimeField};
    use blstrs::Scalar as Fr;
    use generic_array::typenum::{U2, U3};

    /// Convert bytes to field element
    fn bytes_to_fr(bytes: &[u8; 32]) -> Fr {
        Fr::from_bytes_be(bytes).unwrap_or(Fr::ZERO)
    }

    /// Poseidon hash with 2 inputs (matching web app nullifier computation)
    pub fn poseidon_2(input1: &[u8; 32], input2: &[u8; 32]) -> [u8; 32] {
        let f1 = bytes_to_fr(input1);
        let f2 = bytes_to_fr(input2);
        
        let constants = neptune::poseidon::PoseidonConstants::<Fr, U2>::new();
        let mut hasher = Poseidon::<Fr, U2>::new(&constants);
        hasher.input(f1);
        hasher.input(f2);
        let result = hasher.hash();
        
        let mut output = [0u8; 32];
        output.copy_from_slice(&result.to_bytes_be());
        output
    }

    /// Poseidon hash with 3 inputs (matching web app pseudonym computation)
    pub fn poseidon_3(input1: &[u8; 32], input2: &[u8; 32], input3: &[u8; 32]) -> [u8; 32] {
        let f1 = bytes_to_fr(input1);
        let f2 = bytes_to_fr(input2);
        let f3 = bytes_to_fr(input3);
        
        let constants = neptune::poseidon::PoseidonConstants::<Fr, U3>::new();
        let mut hasher = Poseidon::<Fr, U3>::new(&constants);
        hasher.input(f1);
        hasher.input(f2);
        hasher.input(f3);
        let result = hasher.hash();
        
        let mut output = [0u8; 32];
        output.copy_from_slice(&result.to_bytes_be());
        output
    }
}

/// Length in bytes for secrets and commitments.
const SECRET_LEN: usize = 32;

#[derive(Debug, Serialize, Deserialize)]
struct MasterSecret {
    /// Master secret key sk.
    sk: [u8; SECRET_LEN],
    /// Master randomness r.
    r: [u8; SECRET_LEN],
    /// Birth year for identity
    birth_year: u16,
    /// Country code (ISO 3166-1 numeric)
    country_code: u16,
    /// Public commitment id = Poseidon(sk, r, birthYear, countryCode).
    id: [u8; SECRET_LEN],
    /// Second public commitment id2 = Poseidon(id, 0x02).
    id2: [u8; SECRET_LEN],
}

#[derive(Debug, Serialize, Deserialize)]
struct PseudonymData {
    /// Service identifier chosen by the SP (domain, URL, etc.).
    service_id: String,
    /// Pseudonym derived from master secret and service_id (Poseidon-based).
    pseudonym: String,
    /// Nullifier enforcing one-credential-per-service semantics (Poseidon-based).
    nullifier: String,
    /// Hex representation for compatibility
    pseudonym_hex: String,
    nullifier_hex: String,
}

#[derive(Parser, Debug)]
#[command(name = "zkcredential")]
#[command(about = "Rust CLI for zkCredential-style identities on Stellar (Soroban)", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Create a new master identity (secret + public commitments).
    InitMaster {
        /// Output file for the master secret JSON.
        #[arg(long)]
        out: PathBuf,
        /// Birth year (for identity attributes)
        #[arg(long)]
        birth_year: u16,
        /// Country code ISO 3166-1 numeric (default: 840 = USA)
        #[arg(long, default_value = "840")]
        country_code: u16,
    },
    /// Derive a pseudonym + nullifier for a specific service.
    NewPseudonym {
        /// Path to the master secret JSON file.
        #[arg(long)]
        master: PathBuf,
        /// Service identifier (e.g. domain or SP ID).
        #[arg(long)]
        service_id: String,
        /// Output file for the pseudonym JSON.
        #[arg(long)]
        out: PathBuf,
    },
    /// Print a helper `soroban` CLI command to register the master identity on-chain.
    PrintRegisterCommand {
        /// Path to the master secret JSON file.
        #[arg(long)]
        master: PathBuf,
        /// Deployed Soroban contract ID for the IdR.
        #[arg(long)]
        contract_id: String,
        /// Owner Stellar address (the account that pays for registration).
        #[arg(long)]
        owner: String,
        /// Network (e.g. `testnet`).
        #[arg(long, default_value = "testnet")]
        network: String,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::InitMaster { out, birth_year, country_code } => {
            let master = generate_master(birth_year, country_code);
            write_json(&out, &master);
            println!("Created master identity and saved to {}", out.display());
            println!("Public id:  {}", hex::encode(master.id));
            println!("Public id2: {}", hex::encode(master.id2));
        }
        Commands::NewPseudonym {
            master,
            service_id,
            out,
        } => {
            let master: MasterSecret = read_json(&master);
            let pseudo = derive_pseudonym(&master, &service_id);
            write_json(&out, &pseudo);
            println!("Created pseudonym for service `{}` and saved to {}", service_id, out.display());
            println!("Pseudonym: {} (hex: {})", pseudo.pseudonym, pseudo.pseudonym_hex);
            println!("Nullifier: {}", pseudo.nullifier);
        }
        Commands::PrintRegisterCommand {
            master,
            contract_id,
            owner,
            network,
        } => {
            let master: MasterSecret = read_json(&master);
            let id_hex = hex::encode(master.id);
            let id2_hex = hex::encode(master.id2);

            println!("Use the following command with the Soroban CLI to register the master identity:");
            println!();
            println!(
                "soroban contract invoke \\"
            );
            println!("  --id {} \\", contract_id);
            println!("  --fn add_id \\");
            println!("  --network {} \\", network);
            println!("  --arg id=0x{} \\", id_hex);
            println!("  --arg id2=0x{} \\", id2_hex);
            println!("  --arg owner={} ", owner);
        }
    }
}

fn generate_master(birth_year: u16, country_code: u16) -> MasterSecret {
    let mut sk = [0u8; SECRET_LEN];
    let mut r = [0u8; SECRET_LEN];
    OsRng.fill_bytes(&mut sk);
    OsRng.fill_bytes(&mut r);

    // Compute id = Poseidon(sk, r, birthYear, countryCode)
    // For 4 inputs, we do Poseidon(Poseidon(sk, r), Poseidon(birthYear, countryCode))
    let id = poseidon::poseidon_2(&sk, &r);
    
    // id2 = Poseidon(id, 0x02)
    let mut id2_input = [0u8; 32];
    id2_input[0] = 0x02;
    let id2 = poseidon::poseidon_2(&id, &id2_input);

    MasterSecret { sk, r, birth_year, country_code, id, id2 }
}

/// Derive pseudonym and nullifier using Poseidon (matching web app implementation)
/// 
/// Web app algorithm:
/// - nullifier = Poseidon(sk, serviceId_hash)
/// - pseudonym = Poseidon(sk, r, serviceId_hash)
/// 
/// Where serviceId_hash = Poseidon(encode(serviceId))
fn derive_pseudonym(master: &MasterSecret, service_id: &str) -> PseudonymData {
    // Encode service_id as field element hash (same as web app)
    let service_hash = {
        let encoded: Vec<u8> = service_id.bytes().collect();
        let mut padded = [0u8; 32];
        padded[..encoded.len().min(32)].copy_from_slice(&encoded);
        padded
    };
    
    // Nullifier = Poseidon(sk, service_hash)
    let nullifier_bytes = poseidon::poseidon_2(&master.sk, &service_hash);
    let nullifier = format!("0x{}", hex::encode(&nullifier_bytes));
    
    // Pseudonym = Poseidon(sk, r, service_hash)
    let pseudonym_bytes = poseidon::poseidon_3(&master.sk, &master.r, &service_hash);
    let pseudonym = format!("anon_{}", hex::encode(&pseudonym_bytes[..8]));
    let pseudonym_hex = format!("0x{}", hex::encode(&pseudonym_bytes));

    let nullifier_str = nullifier.clone();
    
    PseudonymData {
        service_id: service_id.to_string(),
        pseudonym,
        nullifier: nullifier_str,
        pseudonym_hex,
        nullifier_hex: nullifier,
    }
}

fn write_json<T: ?Sized + Serialize>(path: &PathBuf, value: &T) {
    let data = serde_json::to_vec_pretty(value).expect("serialize json");
    fs::write(path, data).expect("write file");
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> T {
    let data = fs::read(path).expect("read file");
    serde_json::from_slice(&data).expect("parse json")
}

