import { NextRequest, NextResponse } from 'next/server';
import { getCache, delCache } from '@/lib/redis';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_64_chars_long_minimum_for_security');

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();
    if (!phone || !otp) return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });

    const storedOtp = await getCache(`otp:${phone}`);

    if (!storedOtp || storedOtp !== otp) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    // Success - Clear OTP and generate JWT
    await delCache(`otp:${phone}`);

    const token = await new SignJWT({ phone })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(JWT_SECRET);

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
