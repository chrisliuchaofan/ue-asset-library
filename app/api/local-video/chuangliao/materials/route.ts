import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const getDir = () => process.env.LOCAL_VIDEO_CHUANGLIAO_DIR || path.resolve(process.cwd(), '../创量视频下载');

export async function GET() {
    try {
        const dir = getDir();
        const materialsPath = path.join(dir, 'materials.json');
        if (fs.existsSync(materialsPath)) {
            const content = fs.readFileSync(materialsPath, 'utf-8');
            const json = JSON.parse(content);
            return NextResponse.json(json.materials || []);
        } else {
            const downloadsDir = path.join(dir, 'downloads');
            if (!fs.existsSync(downloadsDir)) {
                return NextResponse.json([]);
            }
            const files = fs.readdirSync(downloadsDir);
            const materials = files
                .filter(f => f.endsWith('.mp4'))
                .map(f => ({
                    name: f.replace(/\.mp4$/i, ''),
                    local_path: `downloads/${f}`
                }));
            return NextResponse.json(materials);
        }
    } catch (error) {
        console.error('读取创量本地库失败:', error);
        return NextResponse.json({ error: '读取失败' }, { status: 500 });
    }
}
