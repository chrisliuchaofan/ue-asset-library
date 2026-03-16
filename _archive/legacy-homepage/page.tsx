import React from 'react';
import { AnimatedHero } from '@/components/AnimatedHero';
import { LandingSections } from '@/components/LandingSections';
import { BottomNavigation } from '@/components/BottomNavigation';
import { GalaxyWrapper } from './galaxy-wrapper';
import { HomeClient } from './home-client';
import { getAllMaterials } from '@/lib/materials-data';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // Fetch materials for the 素材库 section
  let materialCards: { id: string; name: string; thumbnail: string; tag: string; type: string }[] = [];
  try {
    const materials = await getAllMaterials();
    materialCards = materials
      .filter((m) => m.thumbnail)
      .slice(0, 6)
      .map((m) => ({
        id: m.id,
        name: m.name,
        thumbnail: m.thumbnail,
        tag: m.tag,
        type: m.type,
      }));
  } catch {
    // Silently fail
  }

  // Fetch asset count for the 资产库 section
  let assetCount = 0;
  try {
    const hasSupabase = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    if (hasSupabase) {
      const supabase = await createServerSupabaseClient();
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });
      assetCount = count ?? 0;
    }
  } catch {
    // Silently fail
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
        background: '#09090b',
      }}
    >
      {/* 星系背景 - 固定定位 */}
      <GalaxyWrapper />

      {/* Hero Section */}
      <AnimatedHero />

      {/* 各模块垂直滚动 Section */}
      <LandingSections materials={materialCards} assetCount={assetCount} />

      {/* 底部导航 */}
      <BottomNavigation />

      {/* 管理入口 */}
      <HomeClient />
    </div>
  );
}
