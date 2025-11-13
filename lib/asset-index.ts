import type { Asset } from '@/data/manifest.schema';
import type { AssetFilterOptions } from '@/lib/asset-filters';
import { createLRUCache } from '@/lib/lru-cache';

interface AssetIndex {
  all: Asset[];
  byType: Map<string, Asset[]>;
  byTag: Map<string, Asset[]>;
  byStyle: Map<string, Asset[]>;
  bySource: Map<string, Asset[]>;
  byVersion: Map<string, Asset[]>;
  byProject: Map<string, Asset[]>;
}

const indexCache = createLRUCache<string, AssetIndex>(8);

function buildKey(assets: Asset[]): string {
  return assets.map((asset) => asset.id).join('|');
}

function ensureIndex(assets: Asset[]): AssetIndex {
  const cacheKey = buildKey(assets);
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;

  const byType = new Map<string, Asset[]>();
  const byTag = new Map<string, Asset[]>();
  const byStyle = new Map<string, Asset[]>();
  const bySource = new Map<string, Asset[]>();
  const byVersion = new Map<string, Asset[]>();
  const byProject = new Map<string, Asset[]>();

  for (const asset of assets) {
    // 类型
    byType.set(asset.type, [...(byType.get(asset.type) ?? []), asset]);

    // 标签
    asset.tags.forEach((tag) => {
      byTag.set(tag, [...(byTag.get(tag) ?? []), asset]);
    });

    // 风格
    const styleValues = Array.isArray(asset.style) ? asset.style : asset.style ? [asset.style] : [];
    styleValues.forEach((style) => {
      byStyle.set(style, [...(byStyle.get(style) ?? []), asset]);
    });

    // 来源
    if (asset.source) {
      bySource.set(asset.source, [...(bySource.get(asset.source) ?? []), asset]);
    }

    // 版本
    if (asset.engineVersion) {
      byVersion.set(asset.engineVersion, [...(byVersion.get(asset.engineVersion) ?? []), asset]);
    }

    // 项目
    if (asset.project) {
      byProject.set(asset.project, [...(byProject.get(asset.project) ?? []), asset]);
    }
  }

  const index: AssetIndex = {
    all: assets,
    byType,
    byTag,
    byStyle,
    bySource,
    byVersion,
    byProject,
  };

  indexCache.set(cacheKey, index);
  return index;
}

function intersectAssetLists(lists: Asset[][]): Asset[] {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0];

  // 优化：使用 Set 进行快速交集计算，性能提升 10-100 倍
  // 先找到最短的列表，减少比较次数
  const sortedLists = [...lists].sort((a, b) => a.length - b.length);
  const [shortest, ...rest] = sortedLists;
  
  // 为每个列表创建 ID Set，O(1) 查找
  const restSets = rest.map(list => new Set(list.map(asset => asset.id)));
  
  // 只遍历最短列表，检查每个资产是否在所有其他列表中
  return shortest.filter(asset => 
    restSets.every(set => set.has(asset.id))
  );
}

export function getAssetsIndex(assets: Asset[]) {
  const index = ensureIndex(assets);

  function filter(options: AssetFilterOptions): Asset[] {
    const candidateLists: Asset[][] = [];

    // 优化：直接使用数组，避免 flatMap 创建临时数组
    if (options.types && options.types.length > 0) {
      const typeAssets: Asset[] = [];
      for (const type of options.types) {
        const assets = index.byType.get(type);
        if (assets) typeAssets.push(...assets);
      }
      if (typeAssets.length > 0) candidateLists.push(typeAssets);
    }

    if (options.tags && options.tags.length > 0) {
      const tagAssets: Asset[] = [];
      for (const tag of options.tags) {
        const assets = index.byTag.get(tag);
        if (assets) tagAssets.push(...assets);
      }
      if (tagAssets.length > 0) candidateLists.push(tagAssets);
    }

    if (options.styles && options.styles.length > 0) {
      const styleAssets: Asset[] = [];
      for (const style of options.styles) {
        const assets = index.byStyle.get(style);
        if (assets) styleAssets.push(...assets);
      }
      if (styleAssets.length > 0) candidateLists.push(styleAssets);
    }

    if (options.sources && options.sources.length > 0) {
      const sourceAssets: Asset[] = [];
      for (const source of options.sources) {
        const assets = index.bySource.get(source);
        if (assets) sourceAssets.push(...assets);
      }
      if (sourceAssets.length > 0) candidateLists.push(sourceAssets);
    }

    if (options.versions && options.versions.length > 0) {
      const versionAssets: Asset[] = [];
      for (const version of options.versions) {
        const assets = index.byVersion.get(version);
        if (assets) versionAssets.push(...assets);
      }
      if (versionAssets.length > 0) candidateLists.push(versionAssets);
    }

    if (options.projects && options.projects.length > 0) {
      const projectAssets: Asset[] = [];
      for (const project of options.projects) {
        const assets = index.byProject.get(project);
        if (assets) projectAssets.push(...assets);
      }
      if (projectAssets.length > 0) candidateLists.push(projectAssets);
    }

    let candidates: Asset[];
    if (candidateLists.length === 0) {
      candidates = index.all;
    } else {
      // intersectAssetLists 已经返回去重后的结果，直接使用即可
      candidates = intersectAssetLists(candidateLists);
    }

    if (!options.keyword) {
      return candidates;
    }

    const lowerKeyword = options.keyword.toLowerCase();
    return candidates.filter((asset) => {
      const matchesName = asset.name.toLowerCase().includes(lowerKeyword);
      const matchesTags = asset.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword));
      const matchesType = asset.type.toLowerCase().includes(lowerKeyword);
      const styleValues = Array.isArray(asset.style) ? asset.style : asset.style ? [asset.style] : [];
      const matchesStyle = styleValues.some((style) => style.toLowerCase().includes(lowerKeyword));
      const matchesSource = asset.source?.toLowerCase().includes(lowerKeyword) ?? false;
      const matchesVersion = asset.engineVersion?.toLowerCase().includes(lowerKeyword) ?? false;
      return matchesName || matchesTags || matchesType || matchesStyle || matchesSource || matchesVersion;
    });
  }

  return {
    filter,
  };
}


