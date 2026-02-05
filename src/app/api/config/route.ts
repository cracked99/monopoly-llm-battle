import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasServerApiKey: !!process.env.OPENROUTER_API_KEY,
  });
}