import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phoneHash = searchParams.get('phoneHash');

  if (!phoneHash) {
    return NextResponse.json({ error: 'Missing phoneHash' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('identity_backups')
    .select('*')
    .eq('phone_hash', phoneHash)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, backup: data });
}

export async function POST(request: Request) {
  const { phoneHash, encrypted_data, iv, salt } = await request.json();

  if (!phoneHash || !encrypted_data || !iv || !salt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Upsert the backup
  const { error } = await supabase
    .from('identity_backups')
    .upsert({
      phone_hash: phoneHash,
      encrypted_data,
      iv,
      salt,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'phone_hash'
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
