/**
 * 公共 API — 获取首页 Hero 轮播视频
 *
 * 返回最近上传的 3 个视频素材，用于 Landing Page 背景。
 * 无需认证（Landing Page 面向未登录用户）。
 * 缓存 5 分钟，避免每次刷新都查库。
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];
const CACHE_MAX_AGE = 300; // 5 分钟

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function GET() {
  try {
    // 只查视频类型，limit 5（减少无效遍历）
    const { data, error } = await (supabaseAdmin as any)
      .from('materials')
      .select('id, name, src, thumbnail, gallery, type')
      .or('type.eq.UE视频,type.eq.AE视频,type.eq.混剪,type.eq.AI视频')
      .not('src', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[hero-videos] Supabase error:', error);
      return NextResponse.json({ videos: [] }, {
        headers: { 'Cache-Control': `public, max-age=60` },
      });
    }

    // 提取有效视频 URL
    const videos: { id: string; name: string; src: string; thumbnail: string }[] = [];

    for (const row of data || []) {
      if (videos.length >= 3) break;

      let videoUrl = '';

      if (row.src && isVideoUrl(row.src)) {
        videoUrl = row.src;
      } else if (row.gallery && Array.isArray(row.gallery)) {
        const vid = row.gallery.find((u: string) => isVideoUrl(u));
        if (vid) videoUrl = vid;
      }

      if (videoUrl) {
        videos.push({
          id: row.id,
          name: row.name,
          src: videoUrl,
          thumbnail: row.thumbnail || '',
        });
      }
    }

    return NextResponse.json({ videos }, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=600`,
      },
    });
  } catch (err) {
    console.error('[hero-videos] Error:', err);
    return NextResponse.json({ videos: [] }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }
}
