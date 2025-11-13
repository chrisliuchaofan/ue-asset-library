import { NextResponse } from 'next/server';
import { getAssetsCount } from '@/lib/storage';

/**
 * Lightweight endpoint that only returns the total count of assets.
 * Used for fast-path optimization when the library is empty.
 */
export async function GET() {
  const start = Date.now();
  try {
    const totalCount = await getAssetsCount();
    const duration = Date.now() - start;
    
    console.log(`[AssetsSummary] totalCount=${totalCount}, durationMs=${duration}, fastPath=${totalCount === 0 ? 'empty' : 'hasData'}`);
    
    const response = NextResponse.json({ totalCount });
    response.headers.set('X-Assets-Summary-Duration', duration.toString());
    response.headers.set('X-Assets-Summary-FastPath', totalCount === 0 ? 'empty' : 'hasData');
    return response;
  } catch (error) {
    console.error('[AssetsSummary] Error:', error);
    // On error, return 0 to be safe (will trigger empty state)
    const response = NextResponse.json({ totalCount: 0 }, { status: 500 });
    return response;
  }
}

