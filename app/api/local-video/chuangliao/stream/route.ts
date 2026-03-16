import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const getDir = () => process.env.LOCAL_VIDEO_CHUANGLIAO_DIR || path.resolve(process.cwd(), '../创量视频下载');

export async function GET(req: NextRequest) {
    const relativePath = req.nextUrl.searchParams.get('path');
    if (!relativePath) {
        return new NextResponse('Missing path', { status: 400 });
    }

    if (relativePath.includes('..')) {
        return new NextResponse('Invalid path', { status: 403 });
    }

    const filePath = path.join(getDir(), relativePath);

    if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get('range');

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        // Convert to readable stream
        const fileNodeStream = fs.createReadStream(filePath, { start, end });
        const stream = new ReadableStream({
            start(controller) {
                fileNodeStream.on('data', chunk => controller.enqueue(chunk));
                fileNodeStream.on('end', () => controller.close());
                fileNodeStream.on('error', err => controller.error(err));
            },
            cancel() {
                fileNodeStream.destroy();
            }
        });

        const headers = new Headers();
        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Content-Length', chunksize.toString());
        headers.set('Content-Type', 'video/mp4');

        return new NextResponse(stream, {
            status: 206,
            headers
        });
    } else {
        const fileNodeStream = fs.createReadStream(filePath);
        const stream = new ReadableStream({
            start(controller) {
                fileNodeStream.on('data', chunk => controller.enqueue(chunk));
                fileNodeStream.on('end', () => controller.close());
                fileNodeStream.on('error', err => controller.error(err));
            },
            cancel() {
                fileNodeStream.destroy();
            }
        });

        const headers = new Headers();
        headers.set('Content-Length', fileSize.toString());
        headers.set('Content-Type', 'video/mp4');

        return new NextResponse(stream, {
            status: 200,
            headers
        });
    }
}
