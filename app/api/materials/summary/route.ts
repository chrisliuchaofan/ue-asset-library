import { NextResponse } from 'next/server';
import { getMaterialsCount } from '@/lib/materials-data';

/**
 * Lightweight endpoint that only returns the total count of materials.
 * Used for fast-path optimization when the library is empty.
 */
export async function GET() {
  const start = Date.now();
  try {
    const totalCount = await getMaterialsCount();
    const duration = Date.now() - start;
    
    console.log(`[MaterialsSummary] totalCount=${totalCount}, durationMs=${duration}, fastPath=${totalCount === 0 ? 'empty' : 'hasData'}`);
    
    const response = NextResponse.json({ totalCount });
    response.headers.set('X-Materials-Summary-Duration', duration.toString());
    response.headers.set('X-Materials-Summary-FastPath', totalCount === 0 ? 'empty' : 'hasData');
    return response;
  } catch (error) {
    console.error('[MaterialsSummary] Error:', error);
    // On error, return 0 to be safe (will trigger empty state)
    const response = NextResponse.json({ totalCount: 0 }, { status: 500 });
    return response;
  }
}

