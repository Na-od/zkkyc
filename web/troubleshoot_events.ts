import { rpc as SorobanRpc, xdr } from '@stellar/stellar-sdk';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const RPC_URL = 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = (process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || "").trim().replace(/["']/g, '');

async function troubleshoot() {
    console.log("=== EVENT TROUBLESHOOTER ===");
    console.log("Contract ID:", CONTRACT_ID);
    
    const server = new SorobanRpc.Server(RPC_URL);
    
    try {
        const latest = await server.getLatestLedger();
        console.log("Latest Ledger:", latest.sequence);
        
        const startLedger = latest.sequence - 10000;
        console.log("Searching last 10,000 ledgers...");
        
        // Configuration A: Explicit contract filter
        console.log("\nConfig A: [{ type: 'contract', contractIds: ['" + CONTRACT_ID + "'] }]");
        const resA = await server.getEvents({
            startLedger: startLedger,
            filters: [{ type: "contract", contractIds: [CONTRACT_ID] }]
        });
        console.log("Found:", resA.events.length);

        // Configuration B: No contract filter (WARNING: slow if lots of events on network)
        // Let's only search 10 ledgers for Config B to avoid overloading
        console.log("\nConfig B: No filter (searching last 10 ledgers only)");
        const resB = await server.getEvents({
            startLedger: latest.sequence - 10,
            filters: []
        });
        console.log("Found in last 10 ledgers:", resB.events.length);
        if (resB.events.length > 0) {
            console.log("Example Event Contract:", resB.events[0].contractId);
        }

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

troubleshoot();
