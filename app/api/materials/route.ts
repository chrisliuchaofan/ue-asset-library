import { NextResponse } from 'next/server';
import { MaterialCreateSchema, type Material } from '@/data/material.schema';
import { createMaterial, getAllMaterials } from '@/lib/materials-data';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { getAllowedProjectsForEmail, isProjectAllowed } from '@/lib/project-permissions';

export async function GET(request: Request) {
  const start = Date.now();
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const allowedProjects = await getAllowedProjectsForEmail(ctx.email);

    if (allowedProjects.length === 0) {
      return NextResponse.json({
        materials: [],
        total: 0,
        page: 1,
        pageSize: 0,
        totalPages: 1,
      });
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    // 使用真实数据源
    const allMaterials = (await getAllMaterials({ teamId: ctx.teamId })).filter((material) =>
      isProjectAllowed(material.project, allowedProjects)
    );

    // 简单分页处理（暂时返回全部，后续可以优化）
    // 如果 pageSize 为 -1 或很大，返回全部数据
    let materials: Material[];
    if (pageSize <= 0 || pageSize >= 1000) {
      materials = allMaterials;
    } else {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      materials = allMaterials.slice(startIndex, endIndex);
    }

    const duration = Date.now() - start;
    const response = NextResponse.json({
      materials,
      total: allMaterials.length,
      page,
      pageSize: pageSize > 0 && pageSize < 1000 ? pageSize : allMaterials.length,
      totalPages: pageSize > 0 && pageSize < 1000 ? Math.ceil(allMaterials.length / pageSize) : 1,
    });
    response.headers.set('X-Materials-Total', duration.toString());
    return response;
  } catch (error) {
    console.error('获取素材列表失败', error);
    const message = error instanceof Error ? error.message : '获取素材列表失败';
    const response = NextResponse.json({ message, materials: [] }, { status: 500 });
    response.headers.set('X-Materials-Error', Date.now().toString());
    return response;
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const json = await request.json();
    
    const parsed = MaterialCreateSchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: '参数验证失败',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const allowedProjects = await getAllowedProjectsForEmail(ctx.email);
    if (!isProjectAllowed(parsed.data.project, allowedProjects)) {
      return NextResponse.json(
        { message: '没有该项目的上传权限，请联系管理员开通' },
        { status: 403 }
      );
    }

    const material = await createMaterial({
      name: parsed.data.name,
      source: parsed.data.source,
      type: parsed.data.type,
      project: parsed.data.project,
      tag: parsed.data.tag,
      quality: parsed.data.quality,
      thumbnail: parsed.data.thumbnail,
      src: parsed.data.src,
      gallery: parsed.data.gallery,
      fileSize: parsed.data.fileSize,
      hash: parsed.data.hash,
      width: parsed.data.width,
      height: parsed.data.height,
      duration: parsed.data.duration,
      platform: parsed.data.platform,
      advertiser: parsed.data.advertiser,
      estimatedSpend: parsed.data.estimatedSpend,
      firstSeen: parsed.data.firstSeen,
      lastSeen: parsed.data.lastSeen,
    }, {
      teamId: ctx.teamId,
    });
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('创建素材失败', error);
    const message =
      error instanceof Error ? error.message : '创建素材失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
