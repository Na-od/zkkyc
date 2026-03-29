import {
  Horizon,
  TransactionBuilder,
  Networks,
  Keypair,
  rpc as SorobanRpc,
  xdr,
  Address,
  Contract,
  Account,
  Transaction
} from '@stellar/stellar-sdk';
import freighter from '@stellar/freighter-api';
const { isConnected, getAddress, signTransaction, requestAccess } = freighter;

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC_URL = process.env.NEXT_PUBLIC_STELLAR_SOROBAN_URL || 'https://soroban-testnet.stellar.org';
const rawContractId = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || '';
const CONTRACT_ID = rawContractId.trim().replace(/["']/g, '');

const server = new Horizon.Server(HORIZON_URL);
const sorobanServer = new SorobanRpc.Server(SOROBAN_RPC_URL);

export async function connectFreighterWallet(): Promise<string> {
  console.log('[WALLET] connectFreighterWallet() called');
  
  // 1. Check if extension exists
  const freighterStatus = await isConnected();
  const isActuallyConnected = typeof freighterStatus === 'boolean' 
    ? freighterStatus 
    : (freighterStatus as any)?.isConnected;
  
  if (!isActuallyConnected) {
    throw new Error('Freighter wallet extension not found. Please install it from freighter.app');
  }
  
  // 2. Request access - this prompts the user for permission AND returns the address
  console.log('[WALLET] Requesting access from Freighter (this will trigger the Share Address popup)...');
  try {
    const response = await requestAccess() as any;
    console.log('[WALLET] requestAccess() keys:', Object.keys(response));
    console.log('[WALLET] requestAccess() full response (stringified):', JSON.stringify(response));
    
    if (response.error) {
      if (response.error.includes('User declined') || response.error.includes('denied')) {
        throw new Error('You declined the connection request in Freighter.');
      }
      throw new Error(`Freighter Error: ${response.error}`);
    }
    
    // Check for address in the response
    const address = response.address;
    
    if (!address || address === '') {
      throw new Error('No address returned. Please ensure your Freighter wallet is UNLOCKED and you have an account selected.');
    }
    
    console.log('[WALLET] Connected as:', address);
    return address;
  } catch (err: any) {
    console.error('[WALLET] Connection failed:', err);
    throw new Error(err.message || 'Failed to connect to Freighter. Please check if the extension is unlocked.');
  }
}

/**
 * Utility to get sign options for Freighter based on current network.
 */
function getFreighterSignOptions() {
  const isTestnet = NETWORK.includes('Test');
  return {
    network: isTestnet ? 'TESTNET' : 'PUBLIC',
    networkPassphrase: NETWORK
  };
}

export async function registerMasterIdentity(phi: string, userAddress: string, secretKey?: string): Promise<string> {
  // Ensure CONTRACT_ID has no quotes or whitespace
  const contractId = (process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID || "").trim().replace(/["']/g, '');
  
  console.log(`[STELLAR] registerMasterIdentity called for Phi: ${phi}`);
  console.log(`[STELLAR] Target Contract: ${contractId}`);
  
  if (!contractId || contractId.length < 56) {
    throw new Error(`Invalid contract ID: "${contractId}".`);
  }

  // 1. Load Account
  let account;
  try {
    account = await server.loadAccount(userAddress);
  } catch (e) {
    throw new Error(`Account ${userAddress} not found on Testnet. Please fund it first using the Friendbot link.`);
  }

  const contract = new Contract(contractId); 

  // 2. Build Transaction
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";
  const { Asset, Operation } = await import('@stellar/stellar-sdk');

  const txBuilder = new TransactionBuilder(account, { 
      fee: '100000', 
      networkPassphrase: NETWORK 
    })
    .setTimeout(0); // REQUIRED: Set infinite timeout or explicit timebounds

  // Add the contract call
  txBuilder.addOperation(contract.call('add_identity', 
    xdr.ScVal.scvBytes(Buffer.from(phi.replace('0x', ''), 'hex'))
  ));

  // 3. Prepare Transaction (Simulation is REQUIRED for Soroban)
  console.log('[STELLAR] Simulating transaction...');
  const preparedTx = await sorobanServer.prepareTransaction(txBuilder.build());

  // 4. Sign Transaction
  let signedTx;
  if (secretKey) {
    console.log('[STELLAR] Signing locally with Secret Key...');
    const kp = Keypair.fromSecret(secretKey);
    preparedTx.sign(kp);
    signedTx = preparedTx as Transaction;
  } else {
    console.log('[STELLAR] Sending to Freighter for signing...');
    const signResult = await signTransaction(preparedTx.toXDR(), getFreighterSignOptions());
    if (signResult.error || !signResult.signedTxXdr) {
      throw new Error(signResult.error || 'Signing failed');
    }
    signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK) as Transaction;
  }

  // 5. Submit and Wait for Confirmation
  console.log('[STELLAR] Submitting transaction...');
  try {
    const result = await sorobanServer.sendTransaction(signedTx);
    console.log('[STELLAR] Submit Result:', result);
    if (result.status === 'ERROR') throw new Error('Transaction submission failed');
    
    // Poll for confirmation
    console.log('[STELLAR] Polling for confirmation...');
    let txResult = await sorobanServer.getTransaction(result.hash);
    let attempts = 0;
    while (txResult.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(r => setTimeout(r, 2000));
      txResult = await sorobanServer.getTransaction(result.hash);
      attempts++;
    }

    if (txResult.status === 'SUCCESS') {
      console.log('[STELLAR] ✅ Transaction confirmed!');
      return result.hash;
    } else {
       throw new Error(`Transaction failed: ${txResult.status}`);
    }
  } catch (e: any) {
    console.error('[STELLAR] Submit/Wait Failed:', e);
    throw new Error(`Blockchain Error: ${e.message}`);
  }
}

/**
 * Dedicated function to pay the 0.1 XLM registration fee.
 * This is done as a separate transaction to avoid Soroban simulation errors with mixed operations.
 */
export async function payRegistrationFee(userAddress: string, secretKey?: string): Promise<string | null> {
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";
  if (!treasuryAddress) return null;

  console.log(`[STELLAR] Paying 0.1 XLM registration fee to ${treasuryAddress}`);
  
  const { Asset, Operation } = await import('@stellar/stellar-sdk');
  const account = await server.loadAccount(userAddress);
  
  const tx = new TransactionBuilder(account, { 
    fee: '100000', 
    networkPassphrase: NETWORK 
  })
  .addOperation(Operation.payment({
    destination: treasuryAddress,
    asset: Asset.native(),
    amount: '0.1'
  }))
  .setTimeout(0)
  .build();

  let finalTx;
  if (secretKey) {
    const kp = Keypair.fromSecret(secretKey);
    tx.sign(kp);
    finalTx = tx as Transaction;
  } else {
    const signResult = await signTransaction(tx.toXDR(), getFreighterSignOptions());
    if (signResult.error || !signResult.signedTxXdr) throw new Error(signResult.error || 'Fee payment signing failed');
    finalTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK) as Transaction;
  }

  const result = await server.submitTransaction(finalTx);
  console.log('[STELLAR] Fee Payment Hash:', result.hash);
  return result.hash;
}
export async function fundWithFriendbot(address: string) {
  const url = `https://friendbot.stellar.org/?addr=${address}`;
  const res = await fetch(url);
  return res.ok;
}

/**
 * Fetches the anonymity set (list of identities) from contract events.
 */
export async function getAnonymitySet(setIndex: number = 0): Promise<string[]> {
  // Ensure CONTRACT_ID has no quotes or whitespace
  const rawId = process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID || '';
  const cleanId = rawId.trim().replace(/["']/g, '');
  
  if (!cleanId) throw new Error('Contract ID not configured');

  const VERSION = "1.0.9"; 
  console.log(`[STELLAR-v${VERSION}] Using Contract ID: [${cleanId}]`);
  
  try {
    const latestLedger = (await sorobanServer.getLatestLedger()).sequence;
    
    // Start with last 10k ledgers (Troubleshooter confirmed this works)
    const startLedger = Math.max(1, latestLedger - 10000); 

    console.log(`[STELLAR-v${VERSION}] Searching range: ${startLedger} to ${latestLedger}`);

    const response = await sorobanServer.getEvents({
      startLedger: startLedger,
      filters: [{ type: "contract", contractIds: [cleanId] }]
    });

    console.log(`[STELLAR-v${VERSION}] Found ${response.events.length} events in last 10k ledgers`);

    const identities = response.events.map((event, i) => {
      try {
        if (!event.topic || event.topic.length < 2) return null;

        const topic0 = (event.topic[0] as any) instanceof xdr.ScVal 
          ? (event.topic[0] as any) 
          : xdr.ScVal.fromXDR(event.topic[0] as any, "base64");
        
        // Access symbol carefully
        const eventName = topic0.value()?.toString() || "";
        console.log(`[STELLAR-v${VERSION}] Event ${i} name: "${eventName}"`);

        if (eventName === "id_added") {
          const idVal = (event.topic[1] as any) instanceof xdr.ScVal 
            ? (event.topic[1] as any) 
            : xdr.ScVal.fromXDR(event.topic[1] as any, "base64");
          
          // idVal should be Bytes, get value as Buffer
          const idBytes = idVal.value() as Buffer;
          const idHex = idBytes.toString("hex");
          console.log(`[STELLAR-v${VERSION}] ✅ Found Identity: ${idHex}`);
          return idHex;
        }
        return null;
      } catch (err) {
        console.error(`[STELLAR-v${VERSION}] Error parsing event ${i}:`, err);
        return null;
      }
    }).filter(id => id !== null) as string[];

    console.log(`[STELLAR-v${VERSION}] Final anonymity set size: ${identities.length}`);
    return identities;
  } catch (e: any) {
    console.error(`[STELLAR-v${VERSION}] getAnonymitySet failed:`, e);
    throw e;
  }
}

/**
 * Submits a pseudonym registration to the Soroban contract.
 */
export async function submitRegistration(params: {
  serviceId: string;
  pseudonym: string;
  nullifier: string;
  proof: string;
  setIndex: number;
  userAddress: string;
  secretKey?: string;
}): Promise<string> {
  const contractId = (process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID || "").trim().replace(/["']/g, '');
  if (!contractId) throw new Error('Contract ID not configured');

  const account = await server.loadAccount(params.userAddress);
  const contract = new Contract(contractId);

  // register_pseudonym(service_id: String, nullifier: BytesN<32>, pseudonym: String, proof: Bytes, set_index: u32)
  const tx = new TransactionBuilder(account, { 
      fee: '100000', 
      networkPassphrase: NETWORK 
    })
    .setTimeout(0)
    .addOperation(contract.call('register_pseudonym',
      xdr.ScVal.scvString(params.serviceId),
      xdr.ScVal.scvBytes(Buffer.from(params.nullifier.replace('0x', ''), 'hex')),
      xdr.ScVal.scvString(params.pseudonym),
      xdr.ScVal.scvBytes(Buffer.from(params.proof, 'hex')),
      xdr.ScVal.scvU32(params.setIndex)
    ))
    .setTimeout(0)
    .build();

  // 2. Prepare Transaction (Simulation)
  console.log('[STELLAR] Simulating registration...');
  const preparedTx = await sorobanServer.prepareTransaction(tx);

  let signedTx;
  if (params.secretKey) {
    const kp = Keypair.fromSecret(params.secretKey);
    preparedTx.sign(kp);
    signedTx = preparedTx as Transaction;
  } else {
    const signResult = await signTransaction(preparedTx.toXDR(), getFreighterSignOptions());
    if (signResult.error || !signResult.signedTxXdr) throw new Error(signResult.error || 'Signing failed');
    signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK) as Transaction;
  }

  console.log('[STELLAR] Submitting registration...');
  const result = await sorobanServer.sendTransaction(signedTx);
  if (result.status === 'ERROR') throw new Error('Transaction submission failed');

  // Poll for confirmation
  console.log('[STELLAR] Polling for confirmation...');
  let txResult = await sorobanServer.getTransaction(result.hash);
  let attempts = 0;
  while (txResult.status === 'NOT_FOUND' && attempts < 10) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await sorobanServer.getTransaction(result.hash);
    attempts++;
  }

  if (txResult.status === 'SUCCESS') {
    return result.hash;
  } else {
    throw new Error(`Transaction failed: ${txResult.status}`);
  }
}

import { supabase } from './supabase';

/**
 * Initialize the contract with an admin address (one-time setup)
 */
export async function initializeContract(adminAddress: string, secretKey?: string): Promise<string> {
  const contractId = (process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID || "").trim().replace(/["']/g, '');
  if (!contractId) throw new Error('Contract ID not configured');

  const contract = new Contract(contractId);
  
  // Build transaction
  const account = await server.loadAccount(adminAddress);
  const tx = new TransactionBuilder(account, { 
      fee: '100000', 
      networkPassphrase: NETWORK 
    })
    .addOperation(contract.call('initialize',
      new Address(adminAddress).toScVal()
    ))
    .setTimeout(0)
    .build();

  // Prepare and sign
  console.log('[STELLAR] Initializing contract...');
  const preparedTx = await sorobanServer.prepareTransaction(tx);

  let signedTx;
  if (secretKey) {
    const kp = Keypair.fromSecret(secretKey);
    preparedTx.sign(kp);
    signedTx = preparedTx as Transaction;
  } else {
    const signResult = await signTransaction(preparedTx.toXDR(), getFreighterSignOptions());
    if (signResult.error || !signResult.signedTxXdr) throw new Error(signResult.error || 'Signing failed');
    signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK) as Transaction;
  }

  const result = await sorobanServer.sendTransaction(signedTx);
  if (result.status === 'ERROR') throw new Error('Initialization failed');

  // Poll for confirmation
  let txResult = await sorobanServer.getTransaction(result.hash);
  let attempts = 0;
  while (txResult.status === 'NOT_FOUND' && attempts < 10) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await sorobanServer.getTransaction(result.hash);
    attempts++;
  }

  if (txResult.status === 'SUCCESS') {
    console.log('[STELLAR] Contract initialized!');
    return result.hash;
  } else {
    throw new Error(`Initialization failed: ${txResult.status}`);
  }
}

/**
 * Admin function to seal an anonymity set with its computed Merkle root
 */
export async function sealSetWithMerkleRoot(
  setIndex: number,
  merkleRoot: string,
  adminAddress: string,
  secretKey?: string
): Promise<string> {
  const contractId = (process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID || "").trim().replace(/["']/g, '');
  if (!contractId) throw new Error('Contract ID not configured');

  const contract = new Contract(contractId);
  const rootBytes = Buffer.from(merkleRoot.replace('0x', ''), 'hex');
  
  const account = await server.loadAccount(adminAddress);
  const tx = new TransactionBuilder(account, { 
      fee: '100000', 
      networkPassphrase: NETWORK 
    })
    .addOperation(contract.call('seal_set',
      xdr.ScVal.scvU32(setIndex),
      xdr.ScVal.scvBytes(rootBytes)
    ))
    .setTimeout(0)
    .build();

  console.log(`[STELLAR] Sealing set ${setIndex} with root ${merkleRoot.slice(0, 20)}...`);
  const preparedTx = await sorobanServer.prepareTransaction(tx);

  let signedTx;
  if (secretKey) {
    const kp = Keypair.fromSecret(secretKey);
    preparedTx.sign(kp);
    signedTx = preparedTx as Transaction;
  } else {
    const signResult = await signTransaction(preparedTx.toXDR(), getFreighterSignOptions());
    if (signResult.error || !signResult.signedTxXdr) throw new Error(signResult.error || 'Signing failed');
    signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK) as Transaction;
  }

  const result = await sorobanServer.sendTransaction(signedTx);
  if (result.status === 'ERROR') throw new Error('Seal transaction failed');

  // Poll
  let txResult = await sorobanServer.getTransaction(result.hash);
  let attempts = 0;
  while (txResult.status === 'NOT_FOUND' && attempts < 10) {
    await new Promise(r => setTimeout(r, 2000));
    txResult = await sorobanServer.getTransaction(result.hash);
    attempts++;
  }

  if (txResult.status === 'SUCCESS') {
    console.log('[STELLAR] Set sealed successfully!');
    return result.hash;
  } else {
    throw new Error(`Seal failed: ${txResult.status}`);
  }
}

/**
 * Check if a set has been sealed
 */
export async function isSetSealed(setIndex: number): Promise<boolean> {
  const contractId = (process.env.NEXT_PUBLIC_STELLAR_CONTRACT_ID || process.env.STELLAR_CONTRACT_ID || "").trim().replace(/["']/g, '');
  if (!contractId) throw new Error('Contract ID not configured');

  try {
    const result = await sorobanServer.getContractData(
      contractId,
      xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Set'),
        xdr.ScVal.scvU32(setIndex)
      ])
    );
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Checks if a nullifier has been used for a specific service.
 * Checks both blockchain and Supabase cache.
 */
export async function checkNullifierUsed(serviceId: string, nullifier: string): Promise<boolean> {
  // 1. Check Supabase cache (fast)
  const { data, error } = await supabase
    .from('registrations')
    .select('id')
    .eq('service_id', serviceId)
    .eq('nullifier', nullifier)
    .single();

  if (data) return true;

  // 2. Placeholder for blockchain check (if needed)
  return false;
}
