# NAS 地址跳转和批量导出功能方案

## 需求概述
1. 根据用户所在办公地（广州/深圳），点击跳转到对应的 NAS 地址
2. 支持多选资产加入清单
3. 批量导出选中资产的 NAS 路径

## 方案设计

### 方案 A：基于资产数据中的 NAS 路径字段（推荐）

#### 数据模型
在资产数据中添加 `nasPath` 字段，存储相对路径：
```typescript
{
  nasPath: "Assets/Characters/Hero_01"  // 相对路径
}
```

#### 功能实现
1. **办公地选择**
   - 在页面顶部添加办公地选择器（广州/深圳）
   - 使用 localStorage 保存用户选择
   - 默认根据 IP 或手动选择

2. **NAS 地址配置**
   - 在环境变量或配置文件中设置：
     ```env
     NAS_BASE_GUANGZHOU=smb://192.168.1.100/Assets
     NAS_BASE_SHENZHEN=smb://192.168.2.100/Assets
     ```

3. **跳转功能**
   - 在资产卡片上添加"打开 NAS"按钮
   - 点击后构建完整路径：`${NAS_BASE}/${nasPath}`
   - 使用 `window.open()` 或 `location.href` 打开

4. **批量导出**
   - 在顶部工具栏添加"导出 NAS 路径"按钮
   - 选中多个资产后，点击导出
   - 生成文本文件，包含：
     ```
     广州 NAS 路径：
     smb://192.168.1.100/Assets/Characters/Hero_01
     smb://192.168.1.100/Assets/Scenes/Scene_01
     
     深圳 NAS 路径：
     smb://192.168.2.100/Assets/Characters/Hero_01
     smb://192.168.2.100/Assets/Scenes/Scene_01
     ```

#### 优点
- 灵活，每个资产可以有不同的 NAS 路径
- 支持复杂的目录结构
- 易于维护和扩展

#### 缺点
- 需要为每个资产添加 `nasPath` 字段
- 如果资产很多，需要批量更新数据

---

### 方案 B：基于资产名称自动生成路径

#### 功能实现
1. **路径生成规则**
   - 根据资产类型和名称自动生成路径
   - 例如：`Assets/${type}/${name}` 或 `Assets/${type}/${sanitizedName}`

2. **办公地选择**（同方案 A）

3. **跳转和导出**（同方案 A）

#### 优点
- 不需要修改现有数据
- 路径生成规则统一

#### 缺点
- 不够灵活，无法处理特殊路径需求
- 如果资产命名不规范，路径可能不准确

---

### 方案 C：混合方案（推荐用于快速实现）

#### 功能实现
1. **优先使用 `nasPath` 字段**（如果存在）
2. **如果没有 `nasPath`，则自动生成**（基于类型和名称）
3. **支持在管理后台批量设置 NAS 路径**

#### 优点
- 兼顾灵活性和快速实现
- 可以逐步完善数据

---

## UI/UX 设计

### 1. 办公地选择器
```
位置：页面顶部，搜索框旁边
样式：[广州] [深圳] 按钮组
功能：点击切换，保存到 localStorage
```

### 2. 资产卡片上的 NAS 按钮
```
位置：资产卡片底部，尺寸信息旁边
样式：小图标按钮（文件夹图标）
功能：点击跳转到对应办公地的 NAS 路径
```

### 3. 批量导出功能
```
位置：顶部工具栏（与多选功能一起）
样式：按钮 "导出 NAS 路径"
功能：
  - 显示选中资产数量
  - 点击后下载文本文件
  - 文件包含两个办公地的完整路径
```

## 技术实现细节

### 1. 环境变量配置
```env
# .env.local
NEXT_PUBLIC_NAS_BASE_GUANGZHOU=smb://192.168.1.100/Assets
NEXT_PUBLIC_NAS_BASE_SHENZHEN=smb://192.168.2.100/Assets
```

### 2. 工具函数
```typescript
// lib/nas-utils.ts
export function getNasPath(asset: Asset, office: 'guangzhou' | 'shenzhen'): string {
  const base = office === 'guangzhou' 
    ? process.env.NEXT_PUBLIC_NAS_BASE_GUANGZHOU
    : process.env.NEXT_PUBLIC_NAS_BASE_SHENZHEN;
  
  const relativePath = asset.nasPath || generatePathFromAsset(asset);
  return `${base}/${relativePath}`;
}

export function exportNasPaths(assets: Asset[], office: 'guangzhou' | 'shenzhen'): void {
  const paths = assets.map(asset => getNasPath(asset, office));
  const content = paths.join('\n');
  downloadFile(`nas-paths-${office}.txt`, content);
}
```

### 3. 组件修改
- `asset-card-gallery.tsx`: 添加 NAS 按钮
- `header-actions.tsx`: 添加导出按钮
- `assets-list.tsx`: 添加办公地选择器

## 数据迁移（如果需要）

如果采用方案 A 或 C，需要：
1. 在 `manifest.schema.ts` 中添加 `nasPath?: string` 字段
2. 在管理后台添加批量设置 NAS 路径的功能
3. 或者提供脚本批量生成路径

## 推荐方案

**推荐使用方案 C（混合方案）**：
- 快速实现：可以先基于自动生成路径
- 灵活扩展：后续可以添加 `nasPath` 字段
- 用户体验好：支持两个办公地切换
- 易于维护：路径规则集中管理

## 待确认问题

1. NAS 地址格式是什么？（smb://, file://, 还是其他？）
2. 两个办公地的 NAS 基础路径是什么？
3. 资产在 NAS 上的实际路径规则是什么？
4. 是否需要支持相对路径和绝对路径？
5. 导出格式有什么要求？（纯文本、CSV、JSON？）


