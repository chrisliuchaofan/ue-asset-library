import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 这里应该查询数据库或缓存中的任务状态
    // 目前由于没有持久化存储任务，直接返回 404 或模拟状态
    
    return NextResponse.json(
      { 
        id, 
        status: 'unknown', 
        message: '任务状态查询暂未接入持久化存储' 
      }, 
      { status: 404 }
    );
    
  } catch (error) {
    return handleApiError(error, '查询任务状态失败');
  }
}
