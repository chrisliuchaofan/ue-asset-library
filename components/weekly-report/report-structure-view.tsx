'use client';

import { useMemo } from 'react';
import type { ReportMaterial } from '@/types/weekly-report';
import { filterAndGroupMaterials, getTop10ByConsumption, categorizeByConsumptionAndROI, calculateOverallStats } from '@/lib/weekly-report/data-filter';
import { ReportTable } from './report-table';

interface ReportStructureViewProps {
  materials: ReportMaterial[];
}

export function ReportStructureView({ materials }: ReportStructureViewProps) {
  const filteredData = useMemo(() => filterAndGroupMaterials(materials), [materials]);

  // 分渠道消耗排名前十
  const top10Weixiao = useMemo(() => getTop10ByConsumption(filteredData.byPromotionType.weixiao), [filteredData.byPromotionType.weixiao]);
  const top10Douxiao = useMemo(() => getTop10ByConsumption(filteredData.byPromotionType.douxiao), [filteredData.byPromotionType.douxiao]);
  const top10App = useMemo(() => getTop10ByConsumption(filteredData.byPromotionType.app), [filteredData.byPromotionType.app]);

  // 整体数据 - 微小
  const weixiaoCategories = useMemo(() => categorizeByConsumptionAndROI(filteredData.byPromotionType.weixiao), [filteredData.byPromotionType.weixiao]);
  const weixiaoStats = useMemo(() => calculateOverallStats(filteredData.byPromotionType.weixiao), [filteredData.byPromotionType.weixiao]);

  // 头条数据
  const toutiaoWeixiaoStats = useMemo(() => calculateOverallStats(filteredData.toutiaoByPromotionType.weixiao), [filteredData.toutiaoByPromotionType.weixiao]);
  const toutiaoDouxiaoStats = useMemo(() => calculateOverallStats(filteredData.toutiaoByPromotionType.douxiao), [filteredData.toutiaoByPromotionType.douxiao]);

  // 广点通数据
  const guangdiantongStats = useMemo(() => calculateOverallStats(filteredData.byChannel.guangdiantong), [filteredData.byChannel.guangdiantong]);

  return (
    <div className="space-y-8">
      {/* 分渠道消耗排名前十 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-medium text-foreground mb-6">分渠道消耗排名前十</h2>
        
        <div className="space-y-6">
          {/* 微小 */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">微小</h3>
            {top10Weixiao.length > 0 ? (
              <ReportTable materials={top10Weixiao} />
            ) : (
              <p className="text-muted-foreground text-sm">暂无数据</p>
            )}
          </div>

          {/* 抖小 */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">抖小</h3>
            {top10Douxiao.length > 0 ? (
              <ReportTable materials={top10Douxiao} />
            ) : (
              <p className="text-muted-foreground text-sm">暂无数据</p>
            )}
          </div>

          {/* APP */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">APP</h3>
            {top10App.length > 0 ? (
              <ReportTable materials={top10App} />
            ) : (
              <p className="text-muted-foreground text-sm">暂无数据</p>
            )}
          </div>
        </div>
      </section>

      {/* 整体数据 - 微小 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-medium text-foreground mb-6">整体数据 - 微小</h2>
        
        {/* 整体统计 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground mb-1">总消耗</p>
            <p className="text-lg font-medium text-foreground">{weixiaoStats.totalConsumption.toLocaleString('zh-CN')}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground mb-1">总素材数</p>
            <p className="text-lg font-medium text-foreground">{weixiaoStats.totalMaterials}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground mb-1">平均ROI</p>
            <p className="text-lg font-medium text-foreground">{weixiaoStats.averageROI.toFixed(2)}%</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground mb-1">达标率</p>
            <p className="text-lg font-medium text-foreground">{weixiaoStats.passRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 爆款 */}
          {weixiaoCategories.blockbuster.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">爆款（30w+, roi1%+）</h3>
              <ReportTable materials={weixiaoCategories.blockbuster} />
            </div>
          )}

          {/* 优质 */}
          {weixiaoCategories.highQuality.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">优质（10w+, roi1%+）</h3>
              <ReportTable materials={weixiaoCategories.highQuality} />
            </div>
          )}

          {/* 达标 */}
          {weixiaoCategories.standard.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">达标（5w+, roi1%+）</h3>
              <ReportTable materials={weixiaoCategories.standard} />
            </div>
          )}

          {/* 潜力 */}
          {weixiaoCategories.potential.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-3">潜力（2-5w, roi1%+）</h3>
              <ReportTable materials={weixiaoCategories.potential} />
            </div>
          )}
        </div>
      </section>

      {/* 分媒体素材数据 */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-medium text-foreground mb-6">分媒体素材数据</h2>

        <div className="space-y-8">
          {/* 一、头条 */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">一、头条</h3>

            {/* 1.1 整体数据（微小首日达标1%） */}
            <div className="mb-6">
              <h4 className="text-base font-medium text-muted-foreground mb-3">1.1 整体数据（微小首日达标1%）</h4>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">总消耗</p>
                  <p className="text-base font-medium text-foreground">{toutiaoWeixiaoStats.totalConsumption.toLocaleString('zh-CN')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">总素材数</p>
                  <p className="text-base font-medium text-foreground">{toutiaoWeixiaoStats.totalMaterials}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">平均ROI</p>
                  <p className="text-base font-medium text-foreground">{toutiaoWeixiaoStats.averageROI.toFixed(2)}%</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">达标率</p>
                  <p className="text-base font-medium text-foreground">{toutiaoWeixiaoStats.passRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* 1.2 整体数据（抖小首日达标2%） */}
            <div className="mb-6">
              <h4 className="text-base font-medium text-muted-foreground mb-3">1.2 整体数据（抖小首日达标2%）</h4>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">总消耗</p>
                  <p className="text-base font-medium text-foreground">{toutiaoDouxiaoStats.totalConsumption.toLocaleString('zh-CN')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">总素材数</p>
                  <p className="text-base font-medium text-foreground">{toutiaoDouxiaoStats.totalMaterials}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">平均ROI</p>
                  <p className="text-base font-medium text-foreground">{toutiaoDouxiaoStats.averageROI.toFixed(2)}%</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">达标率</p>
                  <p className="text-base font-medium text-foreground">{toutiaoDouxiaoStats.passRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* 视频 */}
            <div className="mb-4">
              <h4 className="text-base font-medium text-muted-foreground mb-3">视频</h4>
              {filteredData.byChannel.toutiao.filter(m => {
                const type = m.materialType?.toLowerCase() || '';
                return type.includes('视频') || type.includes('video');
              }).length > 0 ? (
                <ReportTable materials={filteredData.byChannel.toutiao.filter(m => {
                  const type = m.materialType?.toLowerCase() || '';
                  return type.includes('视频') || type.includes('video');
                })} />
              ) : (
                <p className="text-muted-foreground text-sm">暂无数据</p>
              )}
            </div>

            {/* 试玩 */}
            <div>
              <h4 className="text-base font-medium text-muted-foreground mb-3">试玩</h4>
              {filteredData.byChannel.toutiao.filter(m => {
                const type = m.materialType?.toLowerCase() || '';
                return type.includes('试玩') || type.includes('trial') || type.includes('试玩录屏');
              }).length > 0 ? (
                <ReportTable materials={filteredData.byChannel.toutiao.filter(m => {
                  const type = m.materialType?.toLowerCase() || '';
                  return type.includes('试玩') || type.includes('trial') || type.includes('试玩录屏');
                })} />
              ) : (
                <p className="text-muted-foreground text-sm">暂无数据</p>
              )}
            </div>
          </div>

          {/* 二、广点通 */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">二、广点通</h3>

            {/* 2.1 整体素材（广点通首日达标0.7%） */}
            <div className="mb-6">
              <h4 className="text-base font-medium text-muted-foreground mb-3">2.1 整体素材（广点通首日达标0.7%）</h4>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">总消耗</p>
                  <p className="text-base font-medium text-foreground">{guangdiantongStats.totalConsumption.toLocaleString('zh-CN')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">总素材数</p>
                  <p className="text-base font-medium text-foreground">{guangdiantongStats.totalMaterials}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">平均ROI</p>
                  <p className="text-base font-medium text-foreground">{guangdiantongStats.averageROI.toFixed(2)}%</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">达标率</p>
                  <p className="text-base font-medium text-foreground">{guangdiantongStats.passRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* 视频 */}
            <div className="mb-4">
              <h4 className="text-base font-medium text-muted-foreground mb-3">视频</h4>
              {filteredData.guangdiantongByMaterialType.video.length > 0 ? (
                <ReportTable materials={filteredData.guangdiantongByMaterialType.video} />
              ) : (
                <p className="text-muted-foreground text-sm">暂无数据</p>
              )}
            </div>

            {/* 图片 */}
            <div className="mb-4">
              <h4 className="text-base font-medium text-muted-foreground mb-3">图片</h4>
              {filteredData.guangdiantongByMaterialType.image.length > 0 ? (
                <ReportTable materials={filteredData.guangdiantongByMaterialType.image} />
              ) : (
                <p className="text-muted-foreground text-sm">暂无数据</p>
              )}
            </div>

            {/* 试玩 */}
            <div>
              <h4 className="text-base font-medium text-muted-foreground mb-3">试玩</h4>
              {filteredData.guangdiantongByMaterialType.trial.length > 0 ? (
                <ReportTable materials={filteredData.guangdiantongByMaterialType.trial} />
              ) : (
                <p className="text-muted-foreground text-sm">暂无数据</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
