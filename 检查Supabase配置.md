# 如何确认已在使用 Supabase 数据库

## 快速检查方法

### 方法 1: 运行检查脚本（推荐）

```bash
npm run check:supabase
```

或者直接运行：

```bash
npx tsx scripts/check-supabase.ts
```

这个脚本会自动检查：
- ✅ 环境变量是否配置
- ✅ Supabase 连接是否正常
- ✅ `assets` 表是否存在
- ✅ 表结构和字段映射
- ✅ 数据查询是否正常

### 方法 2: 手动检查环境变量

检查 `.env.local` 文件是否包含以下变量：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**如何获取这些值：**
1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 方法 3: 查看浏览器控制台

1. 访问 `http://localhost:3000/assets`
2. 打开浏览器开发者工具（F12）
3. 查看 **Console** 标签页
4. 查找日志：`[AssetsPage] Supabase query: totalCount=X, durationMs=Y`

如果看到这个日志，说明正在使用 Supabase。

### 方法 4: 查看服务器日志

启动开发服务器后，访问资产页面，查看终端输出：

```bash
npm run dev
# 然后访问 http://localhost:3000/assets
```

应该看到类似日志：
```
[AssetsPage] Supabase query: totalCount=10, durationMs=123
```

## 检查清单

### ✅ 环境变量配置
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已配置
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置
- [ ] 值格式正确（URL 以 `https://` 开头）

### ✅ Supabase 项目设置
- [ ] 已创建 Supabase 项目
- [ ] 已创建 `assets` 表
- [ ] 表包含必要字段（至少：`id`, `name`, `type`, `thumbnail`, `src`）

### ✅ 数据库权限
- [ ] RLS (Row Level Security) 策略允许查询
- [ ] 或者已禁用 RLS（仅用于开发）

### ✅ 代码检查
- [ ] `app/assets/page.tsx` 已使用 `createServerSupabaseClient()`
- [ ] 不再使用 `getAllAssets()` 等旧函数

## 常见问题

### ❌ 错误：Missing Supabase environment variables

**原因：** 环境变量未配置

**解决：**
1. 创建 `.env.local` 文件（如果不存在）
2. 添加 Supabase 环境变量
3. 重启开发服务器

### ❌ 错误：relation "assets" does not exist

**原因：** `assets` 表不存在

**解决：**
1. 登录 Supabase Dashboard
2. 进入 **Table Editor**
3. 创建新表 `assets`
4. 添加必要字段

### ❌ 错误：new row violates row-level security policy

**原因：** RLS 策略阻止了查询

**解决：**
1. 进入 Supabase Dashboard → **Authentication** → **Policies**
2. 为 `assets` 表创建策略，允许 SELECT 操作
3. 或者临时禁用 RLS（仅用于开发）

### ⚠️ 页面显示为空但没有错误

**可能原因：**
- 表中没有数据（这是正常的）
- 字段映射不匹配（检查字段名）

**检查：**
1. 运行 `npm run check:supabase` 查看字段结构
2. 确认数据库字段名与代码中的映射匹配

## 验证字段映射

如果数据库字段名与代码中的字段名不同，需要调整映射。检查脚本会显示：

```
5️⃣ 检查关键字段映射:
   ✅ 所有必需字段都存在
   ⚠️  缺少可选字段: engineVersion
```

如果缺少字段，可以：
1. 在数据库中重命名字段
2. 或者修改 `app/assets/page.tsx` 中的 `mapSupabaseRowToAsset` 函数

## 下一步

确认 Supabase 配置正确后：

1. ✅ 访问 `http://localhost:3000/assets` 查看页面
2. ✅ 如果页面正常显示（即使为空），说明配置成功
3. ✅ 可以开始添加数据到 Supabase `assets` 表

## 需要帮助？

如果遇到问题：
1. 运行 `npm run check:supabase` 查看详细诊断信息
2. 检查浏览器控制台和服务器日志
3. 确认 Supabase Dashboard 中的表和数据




