import { describe, it, expect } from 'vitest';
import { AssetSchema, AssetCreateSchema, AssetUpdateSchema } from '@/data/manifest.schema';
import { MaterialSchema, MaterialCreateSchema, MaterialUpdateSchema } from '@/data/material.schema';
import { InspirationSchema, InspirationCreateSchema, InspirationUpdateSchema } from '@/data/inspiration.schema';

// ==================== Asset Schema ====================
describe('AssetSchema', () => {
  const validAsset = {
    id: 'asset-1',
    name: '骑士角色',
    type: '角色',
    project: '项目A',
    tags: ['战斗'],
    thumbnail: '/thumb.jpg',
    src: '/src.png',
  };

  it('accepts valid asset', () => {
    const result = AssetSchema.safeParse(validAsset);
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = AssetSchema.safeParse({ ...validAsset, type: '无效类型' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid project', () => {
    const result = AssetSchema.safeParse({ ...validAsset, project: '不存在项目' });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = AssetSchema.safeParse({
      ...validAsset,
      style: '写实',
      description: '测试描述',
      fileSize: 1024,
      duration: 30,
    });
    expect(result.success).toBe(true);
  });

  it('accepts style as array', () => {
    const result = AssetSchema.safeParse({ ...validAsset, style: ['写实', '卡通'] });
    expect(result.success).toBe(true);
  });
});

describe('AssetCreateSchema', () => {
  const validCreate = {
    name: '新角色',
    type: '角色',
    project: '项目A',
    tags: ['tag1'],
    source: 'Marketplace',
    engineVersion: '5.3',
    guangzhouNas: '/nas/path',
  };

  it('accepts valid create input', () => {
    const result = AssetCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = AssetCreateSchema.safeParse({ ...validCreate, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty tags', () => {
    const result = AssetCreateSchema.safeParse({ ...validCreate, tags: [] });
    expect(result.success).toBe(false);
  });

  it('requires at least one NAS path', () => {
    const result = AssetCreateSchema.safeParse({
      ...validCreate,
      guangzhouNas: undefined,
      shenzhenNas: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('accepts shenzhenNas instead of guangzhouNas', () => {
    const result = AssetCreateSchema.safeParse({
      ...validCreate,
      guangzhouNas: undefined,
      shenzhenNas: '/sznas/path',
    });
    expect(result.success).toBe(true);
  });
});

describe('AssetUpdateSchema', () => {
  it('requires id', () => {
    const result = AssetUpdateSchema.safeParse({ name: '更新名称' });
    expect(result.success).toBe(false);
  });

  it('accepts partial update with id', () => {
    const result = AssetUpdateSchema.safeParse({ id: 'asset-1', name: '新名称' });
    expect(result.success).toBe(true);
  });

  it('validates NAS constraint only when NAS fields provided', () => {
    // Providing only guangzhouNas with empty string should fail
    const result = AssetUpdateSchema.safeParse({
      id: 'asset-1',
      guangzhouNas: '',
      shenzhenNas: '',
    });
    expect(result.success).toBe(false);
  });
});

// ==================== Material Schema ====================
describe('MaterialSchema', () => {
  const validMaterial = {
    id: 'mat-1',
    name: '测试素材',
    source: 'internal',
    type: 'UE视频',
    project: '项目A',
    tag: '爆款',
    quality: ['高品质'],
    thumbnail: '/thumb.jpg',
    src: '/video.mp4',
  };

  it('accepts valid material', () => {
    const result = MaterialSchema.safeParse(validMaterial);
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = MaterialSchema.safeParse({ ...validMaterial, type: '无效类型' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid tag', () => {
    const result = MaterialSchema.safeParse({ ...validMaterial, tag: '无效标签' });
    expect(result.success).toBe(false);
  });

  it('accepts competitor fields', () => {
    const result = MaterialSchema.safeParse({
      ...validMaterial,
      source: 'competitor',
      platform: '抖音',
      advertiser: '某公司',
      estimatedSpend: 50000,
    });
    expect(result.success).toBe(true);
  });

  it('accepts internal fields', () => {
    const result = MaterialSchema.safeParse({
      ...validMaterial,
      consumption: 10000,
      conversions: 500,
      roi: 2.5,
    });
    expect(result.success).toBe(true);
  });
});

describe('MaterialCreateSchema', () => {
  it('requires quality with at least one item', () => {
    const result = MaterialCreateSchema.safeParse({
      name: '新素材',
      type: 'UE视频',
      project: '项目A',
      tag: '爆款',
      quality: [],
    });
    expect(result.success).toBe(false);
  });

  it('defaults source to internal', () => {
    const result = MaterialCreateSchema.safeParse({
      name: '新素材',
      type: 'UE视频',
      project: '项目A',
      tag: '爆款',
      quality: ['高品质'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('internal');
    }
  });
});

// ==================== Inspiration Schema ====================
describe('InspirationSchema', () => {
  it('accepts valid inspiration', () => {
    const result = InspirationSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: 'user-1',
      content: '一个广告创意想法',
      media_urls: [],
      tags: ['创意'],
      source: 'manual',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid source', () => {
    const result = InspirationSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: 'user-1',
      source: 'invalid',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('InspirationCreateSchema', () => {
  it('requires at least one of title/content/media/voice', () => {
    const result = InspirationCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts title-only inspiration', () => {
    const result = InspirationCreateSchema.safeParse({ title: '好创意' });
    expect(result.success).toBe(true);
  });

  it('accepts content-only inspiration', () => {
    const result = InspirationCreateSchema.safeParse({ content: '详细的想法描述' });
    expect(result.success).toBe(true);
  });

  it('accepts media-only inspiration', () => {
    const result = InspirationCreateSchema.safeParse({
      media_urls: ['https://example.com/img.jpg'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts voice-only inspiration', () => {
    const result = InspirationCreateSchema.safeParse({
      voice_url: 'https://example.com/voice.mp3',
    });
    expect(result.success).toBe(true);
  });

  it('rejects title over 200 chars', () => {
    const result = InspirationCreateSchema.safeParse({
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects content over 5000 chars', () => {
    const result = InspirationCreateSchema.safeParse({
      content: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe('InspirationUpdateSchema', () => {
  it('accepts partial update', () => {
    const result = InspirationUpdateSchema.safeParse({ title: '更新标题' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no fields to update)', () => {
    const result = InspirationUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
