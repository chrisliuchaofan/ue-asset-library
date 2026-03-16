import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({
                error: '缺少视频 URL',
                message: '请提供视频链接',
            }, { status: 400 });
        }

        // 验证 URL 格式
        try {
            new URL(url);
        } catch {
            return NextResponse.json({
                error: '无效的 URL',
                message: '请提供有效的视频链接',
            }, { status: 400 });
        }

        // 创建临时目录
        const tempDir = path.join(os.tmpdir(), 'super-insight-videos');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();
        const outputPath = path.join(tempDir, `video_${timestamp}.%(ext)s`);

        const isDouyin = url.includes('douyin.com') || url.includes('iesdouyin.com');
        const isTikTok = url.includes('tiktok.com') || url.includes('vm.tiktok.com');
        const isHuawei = /huaweicloud\.com|myhuaweicloud\.com/i.test(url);

        if (isDouyin || isTikTok) {
            return NextResponse.json({
                error: '不支持链接下载',
                message: '仅支持本地上传，不支持抖音/TikTok 链接。请本地上传视频后使用。',
            }, { status: 400 });
        }
        if (isHuawei) {
            return NextResponse.json({
                error: '不支持该链接',
                message: '华为云等链接不支持拉取，请使用本地上传或创量等可公网访问的链接。',
            }, { status: 400 });
        }

        const ytDlpCommand = `yt-dlp -f "best[ext=mp4]/best" -o "${outputPath}" --no-playlist "${url}"`;

        try {
            await execAsync(ytDlpCommand, {
                timeout: 300000,
                maxBuffer: 10 * 1024 * 1024,
            });

            const files = fs.readdirSync(tempDir);
            const videoFile = files.find(f => f.startsWith(`video_${timestamp}`));

            if (!videoFile) {
                throw new Error('找不到下载的视频文件');
            }

            const videoPath = path.join(tempDir, videoFile);
            const videoBuffer = fs.readFileSync(videoPath);

            // Clean up after sending
            setTimeout(() => {
                try {
                    fs.unlinkSync(videoPath);
                } catch (e) {
                    console.warn('清理临时文件失败:', e);
                }
            }, 5000);

            const headers = new Headers();
            headers.set('Content-Type', 'video/mp4');
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(videoFile)}"`);

            return new NextResponse(videoBuffer, {
                status: 200,
                headers
            });

        } catch (execError: any) {
            console.error('❌ yt-dlp 执行失败:', execError);
            if (execError.message?.includes('yt-dlp: command not found') || execError.message?.includes('yt-dlp: 未找到命令')) {
                return NextResponse.json({
                    error: 'yt-dlp 未安装',
                    message: '请先安装 yt-dlp: brew install yt-dlp (macOS) 或 pip install yt-dlp',
                }, { status: 500 });
            }
            return NextResponse.json({
                error: '视频下载失败',
                message: execError.message || '无法下载视频，请检查链接是否正确',
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('视频下载 API 错误:', error);
        return NextResponse.json({
            error: '服务器错误',
            message: error.message || '未知错误',
        }, { status: 500 });
    }
}
