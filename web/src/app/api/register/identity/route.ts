import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_64_chars_long_minimum_for_security');

export async function POST(req: NextRequest) {
  try {
    const { masterIdentity, walletAddress } = await req.json();
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing SMS verification token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // 1. Verify JWT from SMS step
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const phone = payload.phone as string;

    // 2. Check Supabase for existing phone or identity
    const { supabase } = await import('@/lib/supabase');
    const { data: existing } = await supabase
      .from('identities')
      .select('id')
      .eq('commitment', masterIdentity)
      .single();

    if (existing) {
      // In a real flow, we might return the existing set info instead of error
      console.log('[API] Identity already exists in database');
    }

    // 3. Return target set info
    return NextResponse.json({
      success: true,
      setIndex: 0,
      anonymitySetSize: 128,
      phoneHash: 'sha256_placeholder'
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}
