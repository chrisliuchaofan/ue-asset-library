import { NextResponse } from 'next/server';
import { getMaterialById } from '@/lib/materials-data';
import { createSignedOssUrl } from '@/lib/oss-media';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

function redirectNoStore(url: string | URL) {
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;
    const material = await getMaterialById(id, { teamId: ctx.teamId });

    if (!material) {
      return NextResponse.json({ message: '素材不存在' }, { status: 404 });
    }

    const source = material.src || material.thumbnail;
    if (!source) {
      return NextResponse.json({ message: '素材没有可预览媒体' }, { status: 404 });
    }

    const signedUrl = createSignedOssUrl(source, 60 * 60);
    if (signedUrl) {
      return redirectNoStore(signedUrl);
    }

    if (source.startsWith('/')) {
      return redirectNoStore(new URL(source, request.url));
    }

    return redirectNoStore(source);
  } catch (error) {
    console.error('[MaterialsMedia] 生成素材预览地址失败:', error);
    const message = error instanceof Error ? error.message : '生成素材预览地址失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
