import { NextRequest, NextResponse } from 'next/server';

// Initial baseline services available
const INITIAL_SERVICES = [
  { id: 'm-pesa', name: 'M-Pesa Kenya', category: 'Finance', country: '🇰🇪', description: 'Real-time mobile money transfers.' },
  { id: 'mtn-momo', name: 'MTN MoMo Nigeria', category: 'Finance', country: '🇳🇬', description: 'Leading mobile wallet in Nigeria.' },
  { id: 'knh', name: 'Kenya National Hospital', category: 'Healthcare', country: '🇰🇪', description: 'Access your medical records securely.' }
];

export async function GET() {
  return NextResponse.json(INITIAL_SERVICES);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Logic for SP registration would go here
    return NextResponse.json({ success: true, serviceId: body.name.toLowerCase().replace(/\s+/g, '-') });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
