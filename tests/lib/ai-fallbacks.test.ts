import { describe, expect, it, vi } from 'vitest';

const aiMock = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

const templateDbMock = vi.hoisted(() => ({
  createdTemplates: [] as Array<Record<string, unknown>>,
  relations: [] as Array<Record<string, unknown>>,
  dbCreateTemplate: vi.fn(async (input: any) => {
    templateDbMock.createdTemplates.push(input);
    return {
      id: 'tpl-fallback',
      sourceMaterialIds: input.sourceMaterialIds || [],
      tags: input.tags || [],
      usageCount: 0,
      status: input.status || 'draft',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
      ...input,
    };
  }),
  dbStoreTemplateEmbedding: vi.fn(),
  dbUpsertTemplateMaterialRelation: vi.fn(async (templateId: string, relation: any) => {
    templateDbMock.relations.push({ templateId, ...relation });
    return { id: 'rel-fallback', templateId, ...relation };
  }),
}));

vi.mock('@/lib/ai/ai-service', () => ({
  aiService: {
    generateText: aiMock.generateText,
  },
}));

vi.mock('@/lib/vector-search', () => ({
  generateEmbedding: vi.fn(async () => null),
}));

vi.mock('@/lib/templates/templates-db', () => ({
  dbCreateTemplate: templateDbMock.dbCreateTemplate,
  dbStoreTemplateEmbedding: templateDbMock.dbStoreTemplateEmbedding,
  dbUpsertTemplateMaterialRelation: templateDbMock.dbUpsertTemplateMaterialRelation,
}));

import { extractTemplate } from '@/lib/templates/template-extractor';
import { generateScript } from '@/lib/studio/script-generator';

describe('AI-dependent workflow fallbacks', () => {
  it('creates a usable template when the text model provider is unavailable', async () => {
    aiMock.generateText.mockRejectedValueOnce(new Error('provider unavailable'));

    const template = await extractTemplate([
      {
        id: 'mat-1',
        name: 'high-spend-video.mp4',
        source: 'internal',
        type: 'AI视频',
        project: '项目A',
        tag: '爆款',
        quality: ['常规'],
        thumbnail: '',
        src: '',
        duration: 56,
      },
    ]);

    expect(template.id).toBe('tpl-fallback');
    expect(template.name).toContain('兜底爆款模版');
    expect(template.structure.length).toBeGreaterThan(0);
    expect(template.sourceMaterialIds).toEqual(['mat-1']);
    expect(templateDbMock.relations[0]).toMatchObject({
      templateId: 'tpl-fallback',
      materialId: 'mat-1',
      relationType: 'source',
    });
  });

  it('generates template-aligned scenes when the text model provider is unavailable', async () => {
    aiMock.generateText.mockRejectedValueOnce(new Error('provider unavailable'));

    const script = await generateScript({
      topic: '三冰验收创意',
      sellingPoints: ['开局福利', '强爽点'],
      targetDuration: 20,
      style: '混剪',
      mode: 'template',
      templateId: 'tpl-1',
      templateStructure: [
        { order: 0, type: 'hook', description: '开头强钩子', durationSec: 3 },
        { order: 1, type: 'selling_point', description: '核心卖点', durationSec: 8 },
        { order: 2, type: 'cta', description: '行动号召', durationSec: 4 },
      ],
    });

    expect(script.generationMode).toBe('template');
    expect(script.templateId).toBe('tpl-1');
    expect(script.scenes).toHaveLength(3);
    expect(script.scenes.map(scene => scene.sceneType)).toEqual(['hook', 'selling_point', 'cta']);
    expect(script.totalDuration).toBe(15);
  });
});
