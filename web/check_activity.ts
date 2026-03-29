import { rpc as SorobanRpc, Horizon } from '@stellar/stellar-sdk';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const CONTRACT_ID = (process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || "").trim().replace(/["']/g, '');

async function checkRecentActivity() {
    console.log("=== CONTRACT ACTIVITY CHECK ===");
    console.log("Contract ID:", CONTRACT_ID);
    
    const horizon = new Horizon.Server(HORIZON_URL);
    
    try {
        console.log("\nFetching recent transactions for contract...");
        const txs = await horizon.transactions()
            .forAccount(CONTRACT_ID)
            .order("desc")
            .limit(10)
            .call();
        
        console.log(`Found ${txs.records.length} recent transactions.`);
        
        txs.records.forEach((tx, i) => {
            console.log(`\n[${i}] Hash: ${tx.hash}`);
            console.log(`    Ledger: ${tx.ledger_attr}`);
            console.log(`    Success: ${tx.successful}`);
            console.log(`    Created At: ${tx.created_at}`);
        });

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

checkRecentActivity();
