import { describe, it, expect } from 'vitest';
import { filterAssetsByOptions } from '@/lib/asset-filters';
import type { Asset } from '@/data/manifest.schema';

// Helper to create minimal test assets
function makeAsset(overrides: Partial<Asset> & { name: string; type: string }): Asset {
  return {
    id: overrides.name,
    tags: [],
    thumbnail: '/thumb.jpg',
    src: '/src.png',
    project: '项目A',
    ...overrides,
  } as Asset;
}

const assets: Asset[] = [
  makeAsset({ name: '骑士角色', type: '角色', tags: ['战斗', '骑士'], style: '写实', source: 'Marketplace', engineVersion: '5.3' }),
  makeAsset({ name: '森林场景', type: '场景', tags: ['自然', '森林'], style: '卡通', source: '自制', engineVersion: '5.2', project: '项目B' }),
  makeAsset({ name: '攻击动画', type: '动画', tags: ['战斗', '攻击'], style: ['写实', '半写实'], source: 'Marketplace', engineVersion: '5.3' }),
  makeAsset({ name: '火焰特效', type: '特效', tags: ['特效', '火焰'], source: '自制', engineVersion: '5.1' }),
  makeAsset({ name: '石头材质', type: '材质', tags: ['材质', '石头'], style: '写实', source: 'Marketplace', engineVersion: '5.3', project: '项目C' }),
];

describe('filterAssetsByOptions', () => {
  it('returns all assets when no filters applied', () => {
    expect(filterAssetsByOptions(assets, {})).toHaveLength(5);
  });

  it('returns all assets for empty filter values', () => {
    expect(filterAssetsByOptions(assets, { keyword: '', tags: [], types: [] })).toHaveLength(5);
  });

  // Keyword search
  it('filters by keyword in name', () => {
    const result = filterAssetsByOptions(assets, { keyword: '骑士' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('骑士角色');
  });

  it('filters by keyword in tags', () => {
    const result = filterAssetsByOptions(assets, { keyword: '战斗' });
    expect(result).toHaveLength(2);
  });

  it('filters by keyword in type', () => {
    const result = filterAssetsByOptions(assets, { keyword: '动画' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('攻击动画');
  });

  it('keyword search is case-insensitive', () => {
    const result = filterAssetsByOptions(assets, { keyword: 'MARKETPLACE' });
    expect(result).toHaveLength(3);
  });

  // Tag filter
  it('filters by single tag', () => {
    const result = filterAssetsByOptions(assets, { tags: ['战斗'] });
    expect(result).toHaveLength(2);
  });

  it('filters by multiple tags (OR logic)', () => {
    const result = filterAssetsByOptions(assets, { tags: ['战斗', '自然'] });
    expect(result).toHaveLength(3);
  });

  // Type filter
  it('filters by type', () => {
    const result = filterAssetsByOptions(assets, { types: ['角色'] });
    expect(result).toHaveLength(1);
  });

  it('filters by multiple types', () => {
    const result = filterAssetsByOptions(assets, { types: ['角色', '场景'] });
    expect(result).toHaveLength(2);
  });

  // Style filter
  it('filters by style (string)', () => {
    const result = filterAssetsByOptions(assets, { styles: ['写实'] });
    expect(result).toHaveLength(3); // 骑士角色, 攻击动画 (has ['写实','半写实']), 石头材质
  });

  it('filters by style (array value)', () => {
    const result = filterAssetsByOptions(assets, { styles: ['半写实'] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('攻击动画');
  });

  // Source filter
  it('filters by source', () => {
    const result = filterAssetsByOptions(assets, { sources: ['自制'] });
    expect(result).toHaveLength(2);
  });

  // Version filter
  it('filters by engine version', () => {
    const result = filterAssetsByOptions(assets, { versions: ['5.3'] });
    expect(result).toHaveLength(3);
  });

  // Project filter
  it('filters by project', () => {
    const result = filterAssetsByOptions(assets, { projects: ['项目B'] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('森林场景');
  });

  // Combined filters (AND logic between different criteria)
  it('combines keyword + type filter', () => {
    const result = filterAssetsByOptions(assets, { keyword: '战斗', types: ['角色'] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('骑士角色');
  });

  it('combines type + source', () => {
    const result = filterAssetsByOptions(assets, { types: ['特效'], sources: ['自制'] });
    expect(result).toHaveLength(1);
  });

  // Edge cases
  it('returns empty for non-matching keyword', () => {
    expect(filterAssetsByOptions(assets, { keyword: 'zzz不存在' })).toHaveLength(0);
  });

  it('ignores empty/falsy values in tag array', () => {
    const result = filterAssetsByOptions(assets, { tags: ['', '战斗'] });
    expect(result).toHaveLength(2);
  });

  it('deduplicates filter values', () => {
    const result = filterAssetsByOptions(assets, { tags: ['战斗', '战斗'] });
    expect(result).toHaveLength(2);
  });

  it('handles asset with no style when filtering by style', () => {
    const result = filterAssetsByOptions(assets, { styles: ['写实'] });
    // 火焰特效 has no style → should be excluded
    expect(result.find(a => a.name === '火焰特效')).toBeUndefined();
  });
});
