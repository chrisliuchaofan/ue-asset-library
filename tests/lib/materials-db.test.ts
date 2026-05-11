import { describe, expect, it, vi, beforeEach } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  insertRows: [] as Array<Record<string, unknown>>,
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: supabaseMock.from,
  },
}));

import { dbCreateMaterial } from '@/lib/materials-db';

function createMaterialRow(overrides: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'test-video',
    source: 'internal',
    type: 'AI视频',
    project: '项目A',
    tag: '达标',
    quality: ['常规'],
    thumbnail: 'https://example.com/thumb.mp4',
    src: 'https://example.com/video.mp4',
    gallery: null,
    file_size: null,
    hash: null,
    width: null,
    height: null,
    duration: null,
    recommended: null,
    consumption: null,
    conversions: null,
    roi: null,
    platform: null,
    advertiser: null,
    estimated_spend: null,
    first_seen: null,
    last_seen: null,
    team_id: null,
    status: null,
    platform_name: null,
    platform_id: null,
    campaign_id: null,
    ad_account: null,
    launch_date: null,
    source_script_id: null,
    material_naming: null,
    naming_fields: null,
    naming_verified: null,
    impressions: null,
    clicks: null,
    ctr: null,
    cpc: null,
    cpm: null,
    new_user_cost: null,
    first_day_pay_count: null,
    first_day_pay_cost: null,
    report_period: null,
    created_at: '2026-05-09T00:00:00.000Z',
    updated_at: '2026-05-09T00:00:00.000Z',
    ...overrides,
  };
}

describe('materials db', () => {
  beforeEach(() => {
    supabaseMock.insertRows.length = 0;
    supabaseMock.from.mockReset();
    supabaseMock.from.mockReturnValue({
      insert: vi.fn((row: Record<string, unknown>) => {
        supabaseMock.insertRows.push(row);
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: createMaterialRow(row),
              error: null,
            })),
          })),
        };
      }),
    });
  });

  it('rounds media integer columns before inserting into Supabase', async () => {
    await dbCreateMaterial({
      name: 'test-video',
      source: 'internal',
      type: 'AI视频',
      project: '项目A',
      tag: '达标',
      quality: ['常规'],
      thumbnail: 'https://example.com/thumb.mp4',
      src: 'https://example.com/video.mp4',
      width: 1080,
      height: 1920,
      duration: 56.4,
    });

    expect(supabaseMock.insertRows[0]).toMatchObject({
      width: 1080,
      height: 1920,
      duration: 56,
    });
  });
});
