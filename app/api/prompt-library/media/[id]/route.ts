import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { getOSSClient } from '@/lib/oss-client';
import { dbGetPromptCaseById } from '@/lib/prompt-library/prompt-cases-db';
import { samplePromptCases } from '@/lib/prompt-library/sample-data';

function getOssObjectKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    return key.startsWith('assets/') ? key : null;
  } catch {
    const key = url.replace(/^\/+/, '');
    return key.startsWith('assets/') ? key : null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTeamAccess('content:read');
  const item = isErrorResponse(ctx)
    ? samplePromptCases.find((sample) => sample.id === id && sample.status === 'published')
    : await dbGetPromptCaseById(id, ctx.teamId);

  if (isErrorResponse(ctx) && !item) return ctx;
  if (!item?.mediaUrl) {
    return NextResponse.json({ message: '视频不存在' }, { status: 404 });
  }

  const key = getOssObjectKey(item.mediaUrl);
  if (!key) {
    return NextResponse.redirect(item.mediaUrl);
  }

  try {
    const signedUrl = (getOSSClient() as any).signatureUrl(key, { expires: 60 * 60 });
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('[PromptLibrary] 生成视频签名地址失败:', error);
    return NextResponse.redirect(item.mediaUrl);
  }
}
