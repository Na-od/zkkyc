import * as dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local BEFORE any other imports
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { supabase } from './src/lib/supabase';
import { getAnonymitySet } from './src/lib/stellar';

async function debugSync() {
    console.log("=== SUPABASE & BLOCKCHAIN SYNC DEBUG ===");
    console.log("Contract ID:", process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID);
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    // 1. Check Blockchain Events Directly
    try {
        console.log("\n1. Fetching from Blockchain...");
        const blockchainIds = await getAnonymitySet();
        console.log(`✅ Blockchain returned ${blockchainIds.length} identities.`);
        blockchainIds.forEach((id, i) => console.log(`   [${i}] ${id}`));
        
        if (blockchainIds.length > 0) {
            console.log("\n2. Triggering Sync to Supabase...");
            const { syncIdentities } = await import('./src/lib/indexer');
            const syncedCount = await syncIdentities();
            console.log(`✅ Synced ${syncedCount} identities.`);
        }
    } catch (e: any) {
        console.error("❌ Blockchain fetch failed:", e.message);
    }

    // 3. Check Supabase Table
    try {
        console.log("\n3. Verifying Supabase Table...");
        const { data, error } = await supabase
            .from('identities')
            .select('*');
        
        if (error) throw error;
        console.log(`✅ Supabase has ${data?.length || 0} identities.`);
        data?.forEach((row, i) => console.log(`   [${i}] ${row.commitment} (Hash: ${row.transaction_hash})`));
    } catch (e: any) {
        console.error("❌ Supabase fetch failed:", e.message);
    }
}

debugSync();
