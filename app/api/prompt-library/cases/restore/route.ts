import { NextResponse } from 'next/server';
import { samplePromptCases } from '@/lib/prompt-library/sample-data';
import { dbCreatePromptCase, dbGetPromptCases } from '@/lib/prompt-library/prompt-cases-db';
import { createMaterial, getAllMaterials } from '@/lib/materials-data';
import { getAllowedProjectsForEmail } from '@/lib/project-permissions';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

const STYLE_OPTIONS = ['3D', '三渲二', '动漫', 'Q版', '写实'];
const SUBJECT_OPTIONS = ['末日', '修仙', '热梗'];

function buildUploadStyleTags(item: (typeof samplePromptCases)[number]) {
  const style = item.tags.find((tag) => STYLE_OPTIONS.includes(tag));
  const subject = item.tags.find((tag) => SUBJECT_OPTIONS.includes(tag));
  return Array.from(new Set([item.category, style, subject, item.tool].filter((tag): tag is string => Boolean(tag))));
}

export async function POST() {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const allowedProjects = await getAllowedProjectsForEmail(ctx.email);
    const project = allowedProjects[0];
    if (!project) {
      return NextResponse.json({ message: '没有可用项目权限，无法恢复案例' }, { status: 403 });
    }

    const existingCases = await dbGetPromptCases({
      teamId: ctx.teamId,
      status: 'published',
      mediaType: 'all',
      limit: 500,
    });
    const existingTitles = new Set(existingCases.filter((item) => item.teamId).map((item) => item.title.trim()));
    const existingMaterials = await getAllMaterials({ teamId: ctx.teamId, includeGlobal: false });
    const materialsBySrc = new Map(existingMaterials.map((material) => [material.src, material]));
    const materialsByNameType = new Map(existingMaterials.map((material) => [`${material.name}::${material.type}`, material]));

    const restored = [];
    for (const item of samplePromptCases) {
      if (existingTitles.has(item.title.trim()) || !item.mediaUrl) continue;

      const materialType = item.mediaType === 'video' ? 'AI视频' : '图片';
      let material = materialsBySrc.get(item.mediaUrl) || materialsByNameType.get(`${item.title}::${materialType}`);
      if (!material) {
        material = await createMaterial(
          {
            name: item.title,
            source: 'internal',
            type: materialType,
            project,
            tag: '达标',
            quality: ['常规'],
            thumbnail: item.coverUrl || (item.mediaType === 'image' ? item.mediaUrl : ''),
            src: item.mediaUrl,
          },
          { teamId: ctx.teamId },
        );
        materialsBySrc.set(item.mediaUrl, material);
      }

      const promptCase = await dbCreatePromptCase(
        {
          title: item.title,
          description: item.description,
          prompt: item.prompt,
          tool: item.tool,
          category: item.category,
          tags: buildUploadStyleTags(item),
          mediaType: item.mediaType,
          sourceMaterialId: material.id,
        },
        {
          teamId: ctx.teamId,
          userId: ctx.userId,
        },
      );
      restored.push(promptCase);
    }

    return NextResponse.json({ restored, count: restored.length }, { status: 201 });
  } catch (error: any) {
    console.error('[PromptLibrary] Restore legacy cases failed:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
