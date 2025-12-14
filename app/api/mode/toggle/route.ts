import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createStandardError, ErrorCode } from '@/lib/errors/error-handler';

/**
 * POST /api/mode/toggle
 * 切换用户模式（DRY_RUN <-> REAL）
 * 
 * 注意：这是一个前端状态切换，实际模式由后端控制
 * 这里只是在前端显示中切换，方便测试
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mode, type } = body; // mode: 'DRY_RUN' | 'REAL', type: 'billing' | 'model'

    if (!mode || !['DRY_RUN', 'REAL'].includes(mode)) {
      return NextResponse.json(
        createStandardError(ErrorCode.INVALID_INPUT, '无效的模式参数'),
        { status: 400 }
      );
    }

    if (!type || !['billing', 'model'].includes(type)) {
      return NextResponse.json(
        createStandardError(ErrorCode.INVALID_INPUT, '无效的类型参数（必须是 billing 或 model）'),
        { status: 400 }
      );
    }

    // 注意：这里只是返回切换后的状态，实际模式由后端控制
    // 在生产环境中，应该调用后端 API 来切换模式
    return NextResponse.json({
      success: true,
      mode,
      type,
      message: `已切换到 ${mode} 模式（${type === 'billing' ? '计费' : '模型'}）`,
      note: '这是前端状态切换，实际模式由后端控制。在生产环境中，请通过后端 API 切换。',
    });
  } catch (error) {
    console.error('[API /mode/toggle] 错误:', error);
    return NextResponse.json(
      createStandardError(ErrorCode.INTERNAL_SERVER_ERROR, '切换模式失败'),
      { status: 500 }
    );
  }
}

