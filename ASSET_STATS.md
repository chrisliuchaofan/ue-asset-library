# 资产热度统计功能

## 📋 功能说明

本功能用于记录和统计资产被导出的次数，帮助了解哪些资产使用频率高。

## 🎯 功能特点

- ✅ **自动记录**：每次导出 CSV 时自动记录被导出的资产
- ✅ **热度统计**：自动计算每个资产被导出的次数
- ✅ **无需登录**：不需要用户登录，简单易用
- ✅ **自动清理**：自动清理 6 个月前的旧日志

## 📊 数据存储

- **日志文件**：`data/export-logs.json` - 记录每次导出操作
- **统计文件**：`data/asset-stats.json` - 资产热度统计（自动生成）

**注意**：这些文件已添加到 `.gitignore`，不会提交到 Git。

## 🔍 API 接口

### 1. 记录导出操作

**POST** `/api/activity/log`

```json
{
  "assetIds": ["asset-id-1", "asset-id-2", ...]
}
```

**响应**：
```json
{
  "ok": true,
  "logged": 5
}
```

### 2. 获取资产热度统计

**GET** `/api/activity/stats`

**响应**：
```json
{
  "stats": {
    "asset-id-1": {
      "exportCount": 10,
      "lastExportedAt": "2024-12-07T20:30:00Z"
    },
    "asset-id-2": {
      "exportCount": 5,
      "lastExportedAt": "2024-12-06T15:20:00Z"
    }
  },
  "sorted": [
    {
      "assetId": "asset-id-1",
      "exportCount": 10,
      "lastExportedAt": "2024-12-07T20:30:00Z"
    },
    ...
  ],
  "totalExports": 50,
  "totalLogs": 20
}
```

## 💻 使用示例

### 在组件中获取资产热度

```typescript
import { getAssetStats, getAssetExportCount } from '@/lib/asset-stats';

// 获取所有资产统计
const stats = await getAssetStats();
console.log('热门资产:', stats.sorted.slice(0, 10));

// 获取单个资产的导出次数
const count = await getAssetExportCount('asset-id-1');
console.log('导出次数:', count);
```

### 在资产卡片上显示热度

```tsx
import { getAssetExportCount } from '@/lib/asset-stats';
import { useEffect, useState } from 'react';

function AssetCard({ asset }) {
  const [exportCount, setExportCount] = useState(0);

  useEffect(() => {
    getAssetExportCount(asset.id).then(setExportCount);
  }, [asset.id]);

  return (
    <div>
      <h3>{asset.name}</h3>
      {exportCount > 0 && (
        <span>🔥 已导出 {exportCount} 次</span>
      )}
    </div>
  );
}
```

## 📈 统计说明

- **导出次数**：资产被包含在 CSV 导出中的总次数
- **最后导出时间**：最近一次被导出的时间
- **排序**：按导出次数从高到低排序

## 🔧 配置

### 日志保留时间

默认保留 **6 个月**的日志，可以在 `app/api/activity/log/route.ts` 中修改：

```typescript
const MAX_LOG_AGE_DAYS = 180; // 修改为需要的天数
```

## 📝 注意事项

1. **日志文件位置**：日志文件存储在 `data/` 目录下
2. **自动清理**：每次记录新日志时会自动清理 6 个月前的旧日志
3. **性能**：统计计算是实时的，数据量大时可能需要几秒钟
4. **错误处理**：如果记录日志失败，不会影响 CSV 导出功能

## 🚀 后续扩展

如果需要更高级的功能，可以考虑：

1. **在资产卡片显示热度**：显示 🔥 图标和导出次数
2. **热度排行榜页面**：展示最热门的资产
3. **导出趋势图表**：显示资产使用趋势
4. **用户行为分析**：分析哪些类型的资产更受欢迎

