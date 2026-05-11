import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '@/lib/weekly-report/material-analyzer';

const supabaseMock = vi.hoisted(() => ({
  updateCalls: [] as Array<Record<string, unknown>>,
  filterCalls: [] as Array<{ column: string; value: unknown }>,
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: supabaseMock.from,
  },
}));

import { matchReportMaterials, writebackMetrics } from '@/lib/weekly-report/material-matcher';

function createExcelFile(rows: unknown[][]): File {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, '周报');
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return new File([data], '微小素材周报.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('weekly report metrics parsing', () => {
  it('parses export metrics and keeps legacy cost aliases', async () => {
    const file = createExcelFile([
      [
        '素材名称',
        '消耗',
        '展示',
        '点击',
        'CTR',
        'CPC',
        'CPM',
        '新增成本',
        '新付费数',
        '新付费成本',
      ],
      ['video-a.mp4', '1,234.5', '12,345', '678', '5.49%', '1.82', '100.01', '12.3', '45', '67.8'],
    ]);

    const [material] = await parseExcelFile(file);

    expect(material).toMatchObject({
      name: 'video-a.mp4',
      consumption: 1234.5,
      impressions: 12345,
      clicks: 678,
      ctr: 0.0549,
      cpc: 1.82,
      cpm: 100.01,
      newCost: 12.3,
      newUserCost: 12.3,
      newPaidCount: 45,
      firstDayPayCount: 45,
      newPaidCost: 67.8,
      paidCost: 67.8,
      firstDayPayCost: 67.8,
    });
  });

  it('parses TD raw aliases and stable identifiers', async () => {
    const file = createExcelFile([
      [
        'video_name',
        '素材ID',
        '视频md5值',
        'creative_id',
        'cost',
        'show',
        'click',
        'ctr',
        'cpc',
        'cpm',
        'new_user_cost',
        'new_paid_user',
        'new_paid_user_cost',
        '付费成本',
      ],
      ['td-video.mp4', 'material-001', 'md5-abc', 'creative-009', '2,000', '10,000', '250', '2.5%', '8', '200', '18', '6', '99', '150'],
    ]);

    const [material] = await parseExcelFile(file);

    expect(material).toMatchObject({
      name: 'td-video.mp4',
      platformId: 'material-001',
      videoMd5: 'md5-abc',
      creativeId: 'creative-009',
      consumption: 2000,
      impressions: 10000,
      clicks: 250,
      ctr: 0.025,
      cpc: 8,
      cpm: 200,
      newCost: 18,
      newUserCost: 18,
      newPaidCount: 6,
      firstDayPayCount: 6,
      newPaidCost: 99,
      paidCost: 150,
      firstDayPayCost: 99,
    });
  });
});

describe('weekly report material matching', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
  });

  it('matches by stable identifiers before falling back to names', async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(async () => ({
          data: [
            {
              id: 'mat-1',
              name: 'completely-different-name.mp4',
              platform_name: 'old-platform-name.mp4',
              platform_id: 'creative-009',
              material_naming: null,
              type: 'UE视频',
              project: '咸鱼之王',
              tag: '爆款',
              status: 'published',
              consumption: null,
              roi: null,
              src: '',
              thumbnail: '',
              hash: 'md5-abc',
            },
          ],
          error: null,
        })),
      })),
    });

    const summary = await matchReportMaterials(
      [{ name: 'td-video.mp4', creativeId: 'creative-009', videoMd5: 'md5-abc' }],
      0.95
    );

    expect(summary).toMatchObject({
      total: 1,
      matched: 1,
      exactMatches: 1,
      fuzzyMatches: 0,
      unmatched: 0,
    });
    expect(summary.results[0]).toMatchObject({
      matchType: 'exact',
      confidence: 1,
      reason: '平台素材标识精确匹配',
    });
    expect(summary.results[0]?.material?.id).toBe('mat-1');
  });
});

describe('weekly report metrics writeback', () => {
  beforeEach(() => {
    supabaseMock.updateCalls.length = 0;
    supabaseMock.filterCalls.length = 0;
    supabaseMock.from.mockReset();
    supabaseMock.from.mockReturnValue({
      update: vi.fn((data: Record<string, unknown>) => {
        supabaseMock.updateCalls.push(data);
        const query = {
          eq: vi.fn((column: string, value: unknown) => {
            supabaseMock.filterCalls.push({ column, value });
            return query;
          }),
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: 'mat-1' }, error: null })),
          })),
        };
        return {
          eq: query.eq,
        };
      }),
    });
  });

  it('writes parsed metrics and falls back to legacy newCost/paidCost fields', async () => {
    const result = await writebackMetrics(
      [
        {
          name: 'video-a.mp4',
          material_id: 'mat-1',
          consumption: 100,
          impressions: 10000,
          clicks: 200,
          ctr: 0.02,
          cpc: 0.5,
          cpm: 10,
          newCost: 12.3,
          newPaidCount: 8,
          paidCost: 45.6,
        },
      ],
      '2026-05-01 ~ 2026-05-07'
    );

    expect(result).toMatchObject({ total: 1, updated: 1, failed: 0 });
    expect(supabaseMock.updateCalls[0]).toMatchObject({
      report_period: '2026-05-01 ~ 2026-05-07',
      consumption: 100,
      impressions: 10000,
      clicks: 200,
      ctr: 0.02,
      cpc: 0.5,
      cpm: 10,
      new_user_cost: 12.3,
      first_day_pay_count: 8,
      first_day_pay_cost: 45.6,
    });
  });

  it('scopes writeback updates to the active team only', async () => {
    const result = await writebackMetrics(
      [{ name: 'video-a.mp4', material_id: 'mat-1', consumption: 100 }],
      '2026-05-01 ~ 2026-05-07',
      { teamId: 'team-1' }
    );

    expect(result).toMatchObject({ total: 1, updated: 1, failed: 0 });
    expect(supabaseMock.filterCalls).toEqual(
      expect.arrayContaining([
        { column: 'id', value: 'mat-1' },
        { column: 'team_id', value: 'team-1' },
      ])
    );
  });
});
