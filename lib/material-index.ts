import type { Material } from '@/data/material.schema';
import { createLRUCache } from '@/lib/lru-cache';

export interface MaterialFilterOptions {
  keyword?: string;
  type?: string | null;
  tag?: string | null;
  qualities?: string[];
}

interface MaterialIndex {
  all: Material[];
  byType: Map<string, Material[]>;
  byTag: Map<string, Material[]>;
  byQuality: Map<string, Material[]>;
}

const indexCache = createLRUCache<string, MaterialIndex>(8);

function buildCacheKey(materials: Material[]): string {
  return materials.map((material) => material.id).join('|');
}

function ensureIndex(materials: Material[]): MaterialIndex {
  const key = buildCacheKey(materials);
  const cached = indexCache.get(key);
  if (cached) return cached;

  const byType = new Map<string, Material[]>();
  const byTag = new Map<string, Material[]>();
  const byQuality = new Map<string, Material[]>();

  for (const material of materials) {
    byType.set(material.type, [...(byType.get(material.type) ?? []), material]);
    byTag.set(material.tag, [...(byTag.get(material.tag) ?? []), material]);
    material.quality.forEach((quality) => {
      byQuality.set(quality, [...(byQuality.get(quality) ?? []), material]);
    });
  }

  const index: MaterialIndex = {
    all: materials,
    byType,
    byTag,
    byQuality,
  };

  indexCache.set(key, index);
  return index;
}

function intersect(lists: Material[][]): Material[] {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0];

  const [first, ...rest] = lists;
  return first.filter((material) =>
    rest.every((list) => list.some((item) => item.id === material.id))
  );
}

export function getMaterialsIndex(materials: Material[]) {
  const index = ensureIndex(materials);

  function filter(options: MaterialFilterOptions): Material[] {
    const candidateLists: Material[][] = [];

    if (options.type) {
      candidateLists.push(index.byType.get(options.type) ?? []);
    }

    if (options.tag) {
      candidateLists.push(index.byTag.get(options.tag) ?? []);
    }

    if (options.qualities && options.qualities.length > 0) {
      const qualityList = options.qualities.flatMap((quality) => index.byQuality.get(quality) ?? []);
      candidateLists.push(qualityList);
    }

    let candidates: Material[];
    if (candidateLists.length === 0) {
      candidates = index.all;
    } else {
      candidates = Array.from(
        new Map(intersect(candidateLists).map((material) => [material.id, material])).values()
      );
    }

    if (!options.keyword) {
      return candidates;
    }

    const lower = options.keyword.toLowerCase();
    return candidates.filter((material) =>
      material.name.toLowerCase().includes(lower)
    );
  }

  return {
    filter,
  };
}


