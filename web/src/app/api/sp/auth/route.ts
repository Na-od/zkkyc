import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_64_chars_long_minimum_for_security');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, company_name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    if (action === 'register') {
      if (!company_name) {
         return NextResponse.json({ error: 'Company name is required for registration' }, { status: 400 });
      }

      // Check if SP exists
      const { data: existing } = await supabase
        .from('service_providers')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }

      // Insert new SP
      const { data: newProvider, error } = await supabase
        .from('service_providers')
        .insert({ email, password_hash: passwordHash, company_name })
        .select()
        .single();
        
      if (error || !newProvider) {
        throw new Error(error?.message || 'Failed to create service provider account');
      }

      // Generate JWT
      const token = await new SignJWT({ sp_id: newProvider.id, email: newProvider.email, role: 'service_provider' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(JWT_SECRET);

      return NextResponse.json({ success: true, token, provider: newProvider });

    } else if (action === 'login') {
      // Find SP
      const { data: provider, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('email', email)
        .eq('password_hash', passwordHash)
        .maybeSingle();

      if (error || !provider) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Generate JWT
      const token = await new SignJWT({ sp_id: provider.id, email: provider.email, role: 'service_provider' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(JWT_SECRET);

      return NextResponse.json({ success: true, token, provider });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
