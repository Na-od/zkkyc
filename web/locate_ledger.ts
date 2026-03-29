import { rpc as SorobanRpc, Networks } from '@stellar/stellar-sdk';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const RPC_URL = 'https://soroban-testnet.stellar.org';
const TX_HASH = '8fd880ec20524b7ea51d95630694500ae137c243274884b67399443449eef38b';

async function locateLedger() {
    const server = new SorobanRpc.Server(RPC_URL);
    console.log("Checking Tx:", TX_HASH);
    
    try {
        const tx: any = await server.getTransaction(TX_HASH);
        console.log("Status:", tx.status);
        console.log("Ledger:", tx.ledger);
        
        const latest = await server.getLatestLedger();
        console.log("Latest Ledger:", latest.sequence);
        console.log("Difference:", latest.sequence - tx.ledger);
        
        if (tx.status === 'SUCCESS') {
            console.log("\nSearching for events specifically in ledger", tx.ledger);
            const events = await server.getEvents({
                startLedger: tx.ledger,
                filters: [{ type: "contract", contractIds: [process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID!] }]
            });
            console.log("Events count:", events.events.length);
            events.events.forEach((e, i) => {
                console.log(`Event ${i} details:`, JSON.stringify(e, null, 2));
            });
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

locateLedger();
