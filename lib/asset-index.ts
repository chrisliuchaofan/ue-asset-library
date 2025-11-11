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
  }

  const index: AssetIndex = {
    all: assets,
    byType,
    byTag,
    byStyle,
    bySource,
    byVersion,
  };

  indexCache.set(cacheKey, index);
  return index;
}

function intersectAssetLists(lists: Asset[][]): Asset[] {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0];

  const [first, ...rest] = lists;
  const set = new Set(first.map((asset) => asset.id));

  return first.filter((asset) => rest.every((list) => list.some((item) => item.id === asset.id)));
}

export function getAssetsIndex(assets: Asset[]) {
  const index = ensureIndex(assets);

  function filter(options: AssetFilterOptions): Asset[] {
    const candidateLists: Asset[][] = [];

    if (options.types && options.types.length > 0) {
      candidateLists.push(
        options.types.flatMap((type) => index.byType.get(type) ?? [])
      );
    }

    if (options.tags && options.tags.length > 0) {
      candidateLists.push(
        options.tags.flatMap((tag) => index.byTag.get(tag) ?? [])
      );
    }

    if (options.styles && options.styles.length > 0) {
      candidateLists.push(
        options.styles.flatMap((style) => index.byStyle.get(style) ?? [])
      );
    }

    if (options.sources && options.sources.length > 0) {
      candidateLists.push(
        options.sources.flatMap((source) => index.bySource.get(source) ?? [])
      );
    }

    if (options.versions && options.versions.length > 0) {
      candidateLists.push(
        options.versions.flatMap((version) => index.byVersion.get(version) ?? [])
      );
    }

    let candidates: Asset[];
    if (candidateLists.length === 0) {
      candidates = index.all;
    } else {
      candidates = Array.from(
        new Map(intersectAssetLists(candidateLists).map((asset) => [asset.id, asset])).values()
      );
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


