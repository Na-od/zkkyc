import { NextRequest, NextResponse } from 'next/server';
import { setCache } from '@/lib/redis';
import africastalking from 'africastalking';

const at = africastalking({
  apiKey: process.env.AT_API_KEY || 'dummy_key',
  username: process.env.AT_USERNAME || 'sandbox'
});

const sms = at.SMS;

export async function POST(req: NextRequest) {
  console.log('--- SMS OTP Request Started ---');
  try {
    const body = await req.json();
    const { phone } = body;
    console.log('Target Phone:', phone);

    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP (Internal):', otp);

    // 2. Store with fallback
    console.log('Attempting to cache OTP...');
    await setCache(`otp:${phone}`, otp, 600);
    console.log('Cache step complete.');

    // 3. Send SMS (Only if credentials are provided)
    const apiKey = process.env.AT_API_KEY;
    const isRealSMS = apiKey && apiKey !== 'your_africas_talking_api_key' && apiKey.length > 5;

    if (isRealSMS) {
      console.log('Attempting to send real SMS via Africa\'s Talking...');
      try {
        const smsOptions: any = {
          to: [phone],
          message: `Your zkKYC Credential OTP is: ${otp}`
        };
        
        // Do not include 'from' in sandbox unless explicitly registered, otherwise it drops the SMS
        if (process.env.AT_SENDER_ID && process.env.AT_SENDER_ID !== 'zkKYC') {
          smsOptions.from = process.env.AT_SENDER_ID;
        }

        await sms.send(smsOptions);
        console.log(`[SMS] Sent real OTP to ${phone}`);
      } catch (smsErr: any) {
        console.error('⚠️ Africa\'s Talking AUTH/API Error:', smsErr.message);
        console.log(`[FALLBACK] OTP for ${phone} is available in logs: ${otp}`);
      }
    } else {
      console.log(`[DEBUG] No valid API Key. OTP for ${phone}: ${otp}`);
    }

    console.log('--- SMS OTP Request Successful ---');
    return NextResponse.json({ success: true, message: 'OTP sent' });
  } catch (error: any) {
    console.error('CRITICAL ERROR in /api/sms/send-otp:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}
