import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 视频代理 API - 用于绕过 CORS 限制
 * 使用方法: /api/video-proxy?url=<encoded-video-url>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // 解码 URL
    const decodedUrl = decodeURIComponent(videoUrl);

    // 验证 URL 格式
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log('[Video Proxy] Fetching video:', decodedUrl);

    // 从请求中获取 Range 头（用于视频流式播放）
    const range = request.headers.get('range');
    
    // 构建请求头，模拟浏览器请求
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    // 如果URL包含域名，设置Referer为该域名
    try {
      const urlObj = new URL(decodedUrl);
      headers['Referer'] = `${urlObj.protocol}//${urlObj.host}/`;
      headers['Origin'] = `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
      // 如果URL解析失败，使用原始URL作为Referer
      headers['Referer'] = decodedUrl;
    }

    // 如果有Range请求，添加Range头
    if (range) {
      headers['Range'] = range;
    }

    // 获取视频流
    const videoResponse = await fetch(decodedUrl, {
      headers,
      redirect: 'follow',
    });

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text().catch(() => videoResponse.statusText);
      console.error('[Video Proxy] Failed to fetch video:', videoResponse.status, videoResponse.statusText, errorText.substring(0, 200));
      
      // 如果是403错误，尝试直接返回错误信息，让前端知道需要重新生成视频
      if (videoResponse.status === 403) {
        return NextResponse.json(
          { 
            error: '视频访问被拒绝，可能已过期。请重新生成视频。',
            status: 403,
            code: 'VIDEO_EXPIRED'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Failed to fetch video: ${videoResponse.statusText}`,
          status: videoResponse.status
        },
        { status: videoResponse.status }
      );
    }

    // 获取视频内容类型
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');
    const contentRange = videoResponse.headers.get('content-range');
    const acceptRanges = videoResponse.headers.get('accept-ranges') || 'bytes';

    // 处理Range请求
    if (range && videoResponse.status === 206) {
      // 部分内容响应
      const videoBuffer = await videoResponse.arrayBuffer();
      return new NextResponse(videoBuffer, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': videoResponse.headers.get('content-length') || videoBuffer.byteLength.toString(),
          'Content-Range': contentRange || `bytes ${range}`,
          'Accept-Ranges': acceptRanges,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
        },
      });
    }

    // 完整视频响应
    const videoBuffer = await videoResponse.arrayBuffer();

    // 返回视频流，设置正确的 headers
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || videoBuffer.byteLength.toString(),
        'Accept-Ranges': acceptRanges,
        'Cache-Control': 'public, max-age=3600', // 缓存 1 小时
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      },
    });
  } catch (error: any) {
    console.error('[Video Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

