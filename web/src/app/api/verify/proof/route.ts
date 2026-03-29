import { NextRequest, NextResponse } from 'next/server';
import * as snarkjs from 'snarkjs';
import path from 'path';
import fs from 'fs';
import { buildPoseidon } from 'circomlibjs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { serviceId, serviceName, proof, publicSignals, nullifier, pseudonymCommitment, minAge } = await req.json();

    console.log('[API] Verifying proof for:', serviceName);
    console.log('[API] Public Signals:', publicSignals);
    console.log('[API] Input Nullifier:', nullifier);
    console.log('[API] Input Pseudonym:', pseudonymCommitment);
    // 2. Load verification key from the public circuits folder
    const vKeyPath = path.join(process.cwd(), 'public/circuits/verification_key.json');
    if (!fs.existsSync(vKeyPath)) {
        return NextResponse.json({ error: 'Verification key missing on server' }, { status: 500 });
    }
    const vKey = JSON.parse(fs.readFileSync(vKeyPath, 'utf8'));

    // 3. Verify the mathematical proof itself
    // This strictly ensures the user knows `sk` and `r` that hashes to a leaf inside the Merkle Tree defined by `publicSignals[0]`.
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    if (!isValid) {
      return NextResponse.json({ error: 'Cryptographic proof invalid (Math check failed)' }, { status: 400 });
    }

    // 4. Verify the Service ID matches publicSignals[3]
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const encodedService = BigInt('0x' + Buffer.from(serviceName, 'utf8').toString('hex'));
    const expectedServiceIdBI = BigInt(F.toObject(poseidon([encodedService])));

    if (BigInt(publicSignals[3]) !== expectedServiceIdBI) {
      return NextResponse.json({ error: 'Service ID mismatch. Proof was generated for a different service.' }, { status: 400 });
    }

    // 5. Verify currentYear is accurate (±1 year for timezone/drift)
    const serverYear = new Date().getFullYear();
    const proofYear = parseInt(publicSignals[4]);
    if (Math.abs(serverYear - proofYear) > 1) {
      return NextResponse.json({ error: `Clock drift detected. Server year is ${serverYear}, proof year is ${proofYear}.` }, { status: 400 });
    }

    // 6. Verify minAge matches the service requirement
    if (parseInt(publicSignals[5]) !== minAge) {
      return NextResponse.json({ error: `MinAge mismatch. Service requires ${minAge}, proof uses ${publicSignals[5]}.` }, { status: 400 });
    }
    
    // Ensure the frontend isn't lying about the output variables
    // publicSignals[1] = nullifier, publicSignals[2] = pseudonym
    const signals = {
      root: publicSignals[0],
      nullifier: publicSignals[1],
      pseudonym: publicSignals[2],
      service: publicSignals[3],
      year: publicSignals[4],
      minAge: publicSignals[5]
    };

    if (BigInt(nullifier) !== BigInt(signals.nullifier)) {
       console.error('[API] Nullifier mismatch!', { sent: nullifier, signal: signals.nullifier });
       return NextResponse.json({ 
         error: 'Nullifier mismatch', 
         details: { sent: nullifier, from_proof: signals.nullifier, all_signals: signals }
       }, { status: 400 });
    }
    
    if (pseudonymCommitment && BigInt(pseudonymCommitment) !== BigInt(publicSignals[2])) {
       return NextResponse.json({ error: 'Pseudonym mismatch' }, { status: 400 });
    }

    // Mathematically proven!
    return NextResponse.json({
      valid: true,
      message: 'Zero-Knowledge Proof verified successfully.'
    });

  } catch (error: any) {
    console.error('[API] Proof verification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
