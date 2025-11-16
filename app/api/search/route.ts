import { NextResponse } from 'next/server';
import { getAllAssets } from '@/lib/data';
import { getAllMaterials } from '@/lib/materials-data';
import { getAssetsIndex } from '@/lib/asset-index';
import { getMaterialsIndex } from '@/lib/material-index';
import type { Asset } from '@/data/manifest.schema';
import type { Material } from '@/data/material.schema';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchResult {
  assets: Asset[];
  materials: Material[];
  totalAssets: number;
  totalMaterials: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // all, assets, materials
    const projectParam = searchParams.get('projects');
    // 如果没有项目参数或为空，搜索所有项目
    const project = projectParam && projectParam.trim() ? projectParam : null;

    if (!keyword.trim()) {
      return NextResponse.json({
        assets: [],
        materials: [],
        totalAssets: 0,
        totalMaterials: 0,
      });
    }

    const results: SearchResult = {
      assets: [],
      materials: [],
      totalAssets: 0,
      totalMaterials: 0,
    };

    // 搜索资产
    if (type === 'all' || type === 'assets') {
      const allAssets = await getAllAssets();
      const assetsIndex = getAssetsIndex(allAssets);
      const filterOptions: any = {
        keyword: keyword.trim(),
      };
      // 如果指定了项目，则按项目过滤；否则搜索所有项目
      if (project) {
        filterOptions.projects = [project];
      }
      const filteredAssets = assetsIndex.filter(filterOptions);
      results.assets = filteredAssets;
      results.totalAssets = filteredAssets.length;
    }

    // 搜索素材
    if (type === 'all' || type === 'materials') {
      const allMaterials = await getAllMaterials();
      const materialsIndex = getMaterialsIndex(allMaterials);
      const filterOptions: any = {
        keyword: keyword.trim(),
      };
      // 如果指定了项目，则按项目过滤；否则搜索所有项目
      if (project) {
        filterOptions.project = project;
      }
      const filteredMaterials = materialsIndex.filter(filterOptions);
      results.materials = filteredMaterials;
      results.totalMaterials = filteredMaterials.length;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      {
        error: '搜索失败',
        assets: [],
        materials: [],
        totalAssets: 0,
        totalMaterials: 0,
      },
      { status: 500 }
    );
  }
}

