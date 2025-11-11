import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const entry = {
      ...body,
      receivedAt: new Date().toISOString(),
    };
    console.info('[ClientMetric]', entry);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ClientMetric] 解析失败', error);
    return NextResponse.json({ ok: false, message: 'Invalid payload' }, { status: 400 });
  }
}

export function GET() {
  return NextResponse.json({ ok: true, message: 'POST metrics to this endpoint.' });
}


