import { supabase } from './supabase';
import { getAnonymitySet as fetchFromBlockchain } from './stellar';

/**
 * Syncs identity events from the blockchain to Supabase.
 * This acts as a client-side indexer fallback.
 */
export async function syncIdentities(): Promise<number> {
    console.log('[INDEXER] Syncing identities to Supabase...');
    
    try {
        // 1. Fetch latest identities from blockchain
        const blockchainIdentities = await fetchFromBlockchain();
        
        if (blockchainIdentities.length === 0) {
            console.log('[INDEXER] No identities found on blockchain.');
            return 0;
        }

        // 2. Upsert into Supabase
        const { data, error } = await supabase
            .from('identities')
            .upsert(
                blockchainIdentities.map(id => ({ 
                    commitment: id,
                    ledger_sequence: 0,
                    transaction_hash: 'manual_sync'
                })),
                { onConflict: 'commitment' }
            );

        if (error) {
            console.error('[INDEXER] Supabase Upsert Error:', error);
            throw error;
        }

        console.log(`[INDEXER] Successfully synced ${blockchainIdentities.length} identities.`);
        return blockchainIdentities.length;
    } catch (e) {
        console.error('[INDEXER] Sync failed:', e);
        return 0;
    }
}

/**
 * Fetches the anonymity set from Supabase with a blockchain fallback.
 */
export async function getCachedAnonymitySet(): Promise<string[]> {
    console.log('[INDEXER] Fetching cached anonymity set...');
    
    // Only approved identities are part of the true cryptographic Merkle tree
    const { data, error } = await supabase
        .from('identities')
        .select('commitment')
        .eq('status', 'approved')
        .order('id', { ascending: true });

    if (error) {
        console.warn('[INDEXER] Supabase Fetch Error, falling back to blockchain:', error);
        return fetchFromBlockchain();
    }

    if (!data || data.length === 0) {
        console.log('[INDEXER] Cache empty, syncing from blockchain...');
        await syncIdentities();
        const { data: refreshedData } = await supabase
            .from('identities')
            .select('commitment')
            .eq('status', 'approved')
            .order('id', { ascending: true });
        return refreshedData?.map(d => d.commitment) || [];
    }

    return data.map(d => d.commitment);
}
