import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret_64_chars_long_minimum_for_security');

// Administrator accounts for managing service providers
// Production environments should integrate with a secure identity provider
const ADMIN_ACCOUNTS = [
  { username: 'admin', passwordHash: hashPassword('admin123') },
  { username: 'issuer', passwordHash: hashPassword('issuer123') },
];

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const inputHash = hashPassword(password);
    const admin = ADMIN_ACCOUNTS.find(a => a.username === username && a.passwordHash === inputHash);

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials. Access denied.' }, { status: 401 });
    }

    // Generate JWT token for admin session
    const token = await new SignJWT({ username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    return NextResponse.json({ success: true, token, username });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
