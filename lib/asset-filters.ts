import type { Asset } from '@/data/manifest.schema';

export interface AssetFilterOptions {
  keyword?: string;
  tags?: string[];
  types?: string[];
  styles?: string[];
  sources?: string[];
  versions?: string[];
}

function normalizeArray(values?: string[]): string[] {
  if (!values || values.length === 0) return [];
  return Array.from(new Set(values.filter(Boolean)));
}

export function filterAssetsByOptions(assets: Asset[], options: AssetFilterOptions): Asset[] {
  const { keyword, tags, types, styles, sources, versions } = options;

  const normalizedKeyword = keyword?.trim().toLowerCase() ?? '';
  const normalizedTags = normalizeArray(tags);
  const normalizedTypes = normalizeArray(types);
  const normalizedStyles = normalizeArray(styles);
  const normalizedSources = normalizeArray(sources);
  const normalizedVersions = normalizeArray(versions);

  if (
    !normalizedKeyword &&
    normalizedTags.length === 0 &&
    normalizedTypes.length === 0 &&
    normalizedStyles.length === 0 &&
    normalizedSources.length === 0 &&
    normalizedVersions.length === 0
  ) {
    return assets;
  }

  return assets.filter((asset) => {
    if (normalizedKeyword) {
      const lowerName = asset.name.toLowerCase();
      const matchesName = lowerName.includes(normalizedKeyword);

      const matchesTags = asset.tags.some((tag) => tag.toLowerCase().includes(normalizedKeyword));

      const matchesType = asset.type.toLowerCase().includes(normalizedKeyword);

      const styleValues = Array.isArray(asset.style) ? asset.style : asset.style ? [asset.style] : [];
      const matchesStyle = styleValues.some((style) => style.toLowerCase().includes(normalizedKeyword));

      const matchesSource = asset.source?.toLowerCase().includes(normalizedKeyword) ?? false;
      const matchesVersion = asset.engineVersion?.toLowerCase().includes(normalizedKeyword) ?? false;

      if (!(matchesName || matchesTags || matchesType || matchesStyle || matchesSource || matchesVersion)) {
        return false;
      }
    }

    if (normalizedTags.length > 0) {
      const hasTag = normalizedTags.some((tag) => asset.tags.includes(tag));
      if (!hasTag) return false;
    }

    if (normalizedTypes.length > 0) {
      if (!normalizedTypes.includes(asset.type)) return false;
    }

    if (normalizedStyles.length > 0) {
      if (!asset.style) return false;
      const styleValues = Array.isArray(asset.style) ? asset.style : [asset.style];
      const hasStyle = normalizedStyles.some((style) => styleValues.includes(style));
      if (!hasStyle) return false;
    }

    if (normalizedSources.length > 0) {
      if (!asset.source || !normalizedSources.includes(asset.source)) return false;
    }

    if (normalizedVersions.length > 0) {
      if (!asset.engineVersion || !normalizedVersions.includes(asset.engineVersion)) return false;
    }

    return true;
  });
}


