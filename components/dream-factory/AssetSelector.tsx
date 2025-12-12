'use client';

import React, { useState, useEffect } from 'react';
import type { Asset } from '@/data/manifest.schema';
// 引入 CSS 模块或直接使用 Tailwind
// 注意：这里我们使用 Tailwind 类名，并在全局样式中定义 .dream-factory-root

interface AssetSelectorProps {
  onSelect: (asset: Asset | null) => void;
  selectedAssetId?: string;
}

// 获取客户端资产 URL 的辅助函数 (需要在组件内使用或从 utils 导入)
// 这里为了简化，我们假设 getClientAssetUrl 已经有了，或者直接在这里实现简化版
const getAssetUrl = (asset: Asset): string => {
  const src = asset.src || asset.thumbnail || '';
  if (src.startsWith('http')) return src;
  
  // 简单处理：如果是 OSS 路径，需要拼接域名
  // 这里暂时直接返回 src，依赖外部 utils 或 img 标签的自动处理
  // 更好的方式是导入 lib/utils.ts 中的 getClientAssetUrl
  // 但由于这是客户端组件，动态导入可能更好，或者直接使用 path
  return src;
};

export default function AssetSelector({ onSelect, selectedAssetId }: AssetSelectorProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // 从资产库API获取资产
  useEffect(() => {
    async function fetchAssets() {
      if (hasLoaded) return;
      
      try {
        setLoading(true);
        // 调用资产库查询接口
        const response = await fetch('/api/assets/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // 筛选适合作为参考的资产类型
            types: ['角色', '场景', '其他'], 
            // 限制数量，避免加载过多
            limit: 40,
            projects: ['项目A'] // 必填项，复用资产库默认逻辑
          }),
        });
        
        if (!response.ok) {
            throw new Error('Fetch failed');
        }
        
        const data = await response.json();
        setAssets(data.assets || []);
        setHasLoaded(true);
      } catch (error) {
        console.error('获取资产失败:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, hasLoaded]);
  
  return (
    <div className="w-full relative dream-factory-root">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-small border rounded py-2 px-3 flex items-center justify-between transition-colors ${
          selectedAssetId ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-300' : 'bg-black/30 border-slate-700 text-slate-400'
        }`}
      >
        <span>{selectedAssetId ? '已选参考图' : '选择参考图 (从资产库)'}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="grid grid-cols-4 gap-2 bg-black/90 p-2 rounded mt-1 border border-slate-700 absolute z-50 shadow-xl w-72 top-full left-0 max-h-80 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="col-span-4 text-center text-xs text-slate-400 py-4">加载中...</div>
          ) : (
            <>
              <div 
                className={`cursor-pointer border rounded overflow-hidden aspect-square flex items-center justify-center bg-slate-800 hover:bg-slate-700 ${
                  !selectedAssetId ? 'border-indigo-500' : 'border-transparent'
                }`}
                onClick={() => { onSelect(null); setIsOpen(false); }}
              >
                <span className="text-xs text-slate-400">无</span>
              </div>
              {assets.map(asset => {
                  // 处理 URL
                  let imgUrl = asset.thumbnail || asset.src || '';
                  // 简单的 OSS 处理 (复用 utils 逻辑的简化版)
                  if (imgUrl.startsWith('/') && !imgUrl.startsWith('http')) {
                      // 尝试使用 Next.js Image Loader 或 依赖全局配置
                      // 这里假设客户端环境已有全局配置，或者直接显示相对路径
                  }
                  
                  return (
                    <div 
                      key={asset.id}
                      className={`relative cursor-pointer border rounded overflow-hidden aspect-square group ${
                        selectedAssetId === asset.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-transparent hover:border-slate-500'
                      }`}
                      onClick={() => { onSelect(asset); setIsOpen(false); }}
                      title={asset.name}
                    >
                      {/* 使用 img 标签，后续可优化为 Next Image */}
                      <img 
                        src={imgUrl} 
                        alt={asset.name} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  );
              })}
              {assets.length === 0 && (
                  <div className="col-span-4 text-center text-xs text-slate-500 py-2">
                      暂无可用资产
                  </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
