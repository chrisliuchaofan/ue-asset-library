# 2周执行计划与代码瘦身方案

## 输出 1：2周执行计划（按天/按任务）

### 第一周：上线阻塞任务（P0）

#### 第1天（周一）：环境变量校验脚本

**任务**：环境变量清单与校验脚本（任务1）

**目标**：
- 创建/增强环境变量校验脚本，确保所有必需变量已配置
- 建立完整的环境变量清单文档

**影响范围**：
- `scripts/check-env.ts` - 创建或增强脚本
- `ENV_VARIABLES.md` - 更新文档（如存在）

**具体步骤**：
1. 检查 `scripts/check-env.ts` 是否存在
   - 如果存在：阅读代码，了解当前实现
   - 如果不存在：创建新文件
2. 从 `CONSTRAINTS.md` 环境变量清单中提取所有必需变量
3. 编写校验逻辑：
   - 检查必需变量是否存在
   - 检查变量格式是否正确（如 NEXTAUTH_SECRET 长度 >= 32）
   - 检查环境变量一致性（如 STORAGE_MODE 和 NEXT_PUBLIC_STORAGE_MODE 必须一致）
4. 添加清晰的错误提示：
   - 列出缺失的变量
   - 列出格式错误的变量
   - 列出不一致的变量
5. 在脚本顶部添加注释：
   - 输入：读取环境变量（从 process.env）
   - 输出：JSON 格式的校验结果 + 控制台输出
   - 失败提示：明确指出哪些变量有问题
   - 运行方法：`npm run check:env` 或 `tsx scripts/check-env.ts`
6. 在 `package.json` 中添加/更新脚本命令：`"check:env": "tsx scripts/check-env.ts"`
7. 更新 `ENV_VARIABLES.md`（如存在）或创建新的环境变量文档

**验收标准**：
- ✅ 运行 `npm run check:env` 可以检查所有必需变量
- ✅ 脚本输出清晰的错误提示（哪些变量缺失、格式错误、不一致）
- ✅ 脚本包含完整的注释（输入/输出/失败提示/运行方法）
- ✅ 环境变量清单文档完整（列出所有变量、用途、必需/可选、示例格式）

**风险与回滚方式**：
- 🟢 **低风险**：主要是新增脚本，不影响现有代码
- 如果脚本有问题，直接修改脚本即可，无需回滚

**AI/人工分工**：
- ✅ **AI 辅助**：AI 可以生成脚本代码和文档
- ⚠️ **人工 review**：需要人工确认环境变量清单的完整性和准确性

---

#### 第2-3天（周二-周三）：OSS 读写与 manifest 一致性

**任务**：OSS 读写与 manifest 一致性（任务2）

**目标**：
- 确保生产环境强制使用 OSS 模式
- 创建存储模式配置检查脚本（可选）
- 验证 OSS 读写 manifest 数据正常

**影响范围**：
- `lib/storage.ts` - 增强存储模式推断逻辑
- `scripts/check-storage-config.ts` - 创建存储配置检查脚本（可选）
- `ENV_VARIABLES.md` - 更新 OSS 相关说明

**具体步骤**：
1. **检查当前存储模式推断逻辑**：
   - 打开 `lib/storage.ts`
   - 找到 `getStorageMode()` 或类似的存储模式推断函数
   - 阅读代码，了解当前逻辑
2. **增强生产环境强制 OSS 逻辑**：
   - 在存储模式推断函数中添加检查：
     - 如果 `NODE_ENV === 'production'` 或 `process.env.VERCEL === '1'`，强制返回 `'oss'`
     - 如果检测到生产环境但 `STORAGE_MODE !== 'oss'`，抛出明确错误
   - 错误信息示例：`"生产环境必须使用 OSS 模式，当前配置为 ${STORAGE_MODE}"`
3. **验证 OSS 读写逻辑**：
   - 检查 `lib/storage.ts` 中的 OSS 读写函数（如 `readOSSManifest`, `writeOSSManifest`）
   - 确保错误处理完整
   - 测试 OSS 读写 manifest.json、materials.json 是否正常
4. **创建存储配置检查脚本（可选）**：
   - 创建 `scripts/check-storage-config.ts`
   - 检查存储模式配置是否正确
   - 检查 OSS 配置是否完整（OSS_BUCKET, OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET）
   - 输出清晰的错误提示
5. **更新文档**：
   - 在 `CONSTRAINTS.md` 或相关文档中明确说明：OSS 仅用于展示必需数据（manifest/materials/预览/缩略图），不用于全量资产分发

**验收标准**：
- ✅ 生产环境（`NODE_ENV=production` 或 `VERCEL=1`）强制使用 OSS 模式
- ✅ 如果生产环境配置为 local 模式，系统抛出明确错误并提示
- ✅ OSS 读写 manifest.json、materials.json 正常（需要实际测试）
- ✅ 存储配置检查脚本（如创建）可以验证配置正确性

**风险与回滚方式**：
- 🟡 **中等风险**：修改存储模式推断逻辑可能影响现有部署
- **回滚方式**：
  - 如果部署后出现问题，立即回滚到上一个版本（Git revert）
  - 或者临时移除强制 OSS 检查，恢复原逻辑

**AI/人工分工**：
- ✅ **AI 辅助**：AI 可以帮助修改存储模式推断逻辑和创建检查脚本
- ⚠️ **人工 review**：需要人工确认 OSS 配置正确性，并在测试环境验证

---

#### 第4天（周四）：Node 版本锁定

**任务**：Node/依赖版本锁定（任务5）

**目标**：
- 明确 Node.js 版本要求（Node 20）
- 创建 `.nvmrc` 文件指定 Node 版本

**影响范围**：
- `.nvmrc` - 创建文件
- `README.md` - 添加版本要求说明

**具体步骤**：
1. 检查当前使用的 Node.js 版本：
   - 运行 `node --version`，确认版本（应该是 v20.x.x）
2. 创建 `.nvmrc` 文件：
   - 在项目根目录创建 `.nvmrc`
   - 内容：`20` 或 `20.x.x`（根据实际使用的版本）
3. 更新 `README.md`：
   - 在"环境要求"或"开发环境设置"部分添加 Node.js 版本要求
   - 说明如何使用 `.nvmrc`：`nvm use` 或 `nvm install`
4. 验证：
   - 运行 `nvm use`（如果安装了 nvm），确认能正确切换到指定版本
   - 运行 `npm install`，确认依赖安装正常

**验收标准**：
- ✅ `.nvmrc` 文件存在，内容为 Node 20
- ✅ `README.md` 包含 Node.js 版本要求说明
- ✅ 使用 `.nvmrc` 指定的版本可以正常安装依赖和运行项目

**风险与回滚方式**：
- 🟢 **低风险**：主要是配置和文档工作
- 如果出现问题，删除 `.nvmrc` 文件即可

**AI/人工分工**：
- ✅ **AI 辅助**：AI 可以创建 `.nvmrc` 文件和更新 README
- ⚠️ **人工 review**：需要人工确认当前实际使用的 Node.js 版本

---

#### 第5天（周五）：NAS 路径展示定位能力验证

**任务**：NAS 路径展示定位能力（任务3 - 第一天）

**目标**：
- 检查 NAS 路径字段定义
- 验证 NAS 路径在资产详情页的展示
- 检查 NAS 路径为空时的空状态处理

**影响范围**：
- `data/manifest.schema.ts` - 验证 NAS 路径字段定义
- `components/asset-detail-dialog.tsx` - 资产详情页 NAS 路径展示
- `app/assets/[id]/page.tsx` - 资产详情页 NAS 路径展示

**具体步骤**：
1. **检查 NAS 路径字段定义**：
   - 打开 `data/manifest.schema.ts`
   - 确认 `guangzhouNas` 和 `shenzhenNas` 字段存在且定义为 `z.string().optional()`
   - 确认 `AssetCreateSchema` 中的验证规则：至少填写一个 NAS 路径
2. **检查资产详情页 NAS 路径展示**：
   - 打开 `components/asset-detail-dialog.tsx` 或 `app/assets/[id]/page.tsx`
   - 搜索 `guangzhouNas` 或 `shenzhenNas`
   - 确认 NAS 路径是否正确显示
   - 检查是否有复制按钮或复制功能
3. **检查空状态处理**：
   - 确认当 NAS 路径为空时，显示合适的空状态（如"暂无路径"或隐藏该字段）
4. **检查后台管理页 NAS 路径展示**：
   - 打开 `components/admin/admin-dashboard.tsx`
   - 搜索 NAS 路径相关的代码
   - 确认 NAS 路径在列表页和编辑页是否正确显示

**验收标准**：
- ✅ NAS 路径字段在 schema 中正确定义
- ✅ NAS 路径在资产详情页正确显示
- ✅ NAS 路径为空时显示合适的空状态
- ✅ NAS 路径可以在后台管理页正确显示和编辑

**风险与回滚方式**：
- 🟡 **中等风险**：NAS 路径是系统核心约束，修改需谨慎
- **回滚方式**：如果出现问题，恢复之前的代码（Git revert）

**AI/人工分工**：
- ✅ **AI 辅助**：AI 可以帮助检查和修复 NAS 路径展示问题
- ⚠️ **人工 review**：需要人工在浏览器中实际测试 NAS 路径的显示和功能

---

### 第二周：核心功能稳定（P0 + P1）

#### 第6天（周一）：NAS 路径权限控制和基础错误处理

**任务**：NAS 路径展示定位能力（任务3 - 第二天）+ 基础错误处理（任务4 - 第一天）

**目标**：
- 验证 NAS 路径权限控制（如果需要）
- 开始实现基础错误处理

**影响范围**：
- `components/asset-detail-dialog.tsx` - NAS 路径权限控制
- `lib/error-handler.ts` - 创建统一错误处理（如不存在）
- `app/api/*` - API 路由的错误处理

**具体步骤**：
1. **NAS 路径权限控制（如果需要）**：
   - 检查是否需要权限控制（只有授权用户能看到 NAS 路径）
   - 如果需要，在组件中添加权限检查
   - 使用 `lib/auth.ts` 的 `isAuthenticated()` 或 `getCurrentUser()` 进行验证
2. **创建统一错误处理**：
   - 检查 `lib/error-handler.ts` 是否存在
   - 如果不存在，创建新文件
   - 定义统一的错误处理函数：
     - `handleError(error: Error, context?: string)` - 处理错误并返回用户友好的错误消息
     - `logError(error: Error, context?: string)` - 记录错误日志
3. **检查 API 路由错误处理**：
   - 打开 `app/api/assets/route.ts` 等主要 API 路由
   - 检查是否有 try-catch 错误处理
   - 如果没有，添加错误处理，使用统一的错误处理函数

**验收标准**：
- ✅ NAS 路径权限控制正确（如果实现了）
- ✅ 统一错误处理函数存在且可用
- ✅ 主要 API 路由有错误处理，不会导致 500 错误崩溃

**风险与回滚方式**：
- 🟡 **中等风险**：错误处理不当可能隐藏问题
- **回滚方式**：如果错误处理导致问题，恢复之前的代码

**AI/人工分工**：
- ✅ **AI 辅助**：AI 可以帮助创建错误处理函数和添加错误处理逻辑
- ⚠️ **人工 review**：需要人工测试错误场景，确认错误处理正确

---

#### 第7天（周二）：基础错误处理完善

**任务**：基础错误处理（任务4 - 第二天）

**目标**：
- 完善 API 路由的错误处理
- 创建错误边界组件

**影响范围**：
- `app/api/*` - 所有 API 路由的错误处理
- `components/error-boundary.tsx` - 创建错误边界组件

**具体步骤**：
1. **完善 API 路由错误处理**：
   - 检查所有 `app/api/*` 下的路由文件
   - 为每个路由添加 try-catch 错误处理
   - 使用统一的错误处理函数返回用户友好的错误消息
   - 确保错误不会导致 500 错误，而是返回合适的 HTTP 状态码和错误消息
2. **创建错误边界组件**：
   - 创建 `components/error-boundary.tsx`
   - 实现 React Error Boundary
   - 显示友好的错误提示，而不是白屏或技术错误信息
3. **在主要页面使用错误边界**：
   - 在 `app/layout.tsx` 或主要页面组件中包裹错误边界

**验收标准**：
- ✅ 所有主要 API 路由有错误处理，不会导致 500 错误崩溃
- ✅ 错误边界组件存在，可以捕获 React 组件错误
- ✅ 用户看到友好的错误消息，而不是技术错误信息

**风险与回滚方式**：
- 🟡 **中等风险**：错误处理不当可能隐藏问题
- **回滚方式**：如果错误处理导致问题，恢复之前的代码

**AI/人工分工**：
- ✅ **AI 辅助**：AI 可以帮助创建错误边界组件和添加错误处理逻辑
- ⚠️ **人工 review**：需要人工测试各种错误场景，确认错误处理正确

---

#### 第8-10天（周三-周五）：即梦工厂 AI 功能稳定

**任务**：即梦工厂 AI 功能稳定（任务6）

**目标**：
- 确保即梦工厂 AI 功能的稳定性和可用性
- 优化 AI 功能的错误处理和用户体验
- 确保积分系统和计费逻辑正常

**影响范围**：
- `app/dream-factory/page.tsx` - 即梦工厂主页面
- `components/dream-factory/` - 即梦工厂相关组件
- `app/api/ai/*` - AI 功能 API（即梦工厂相关）
- `lib/backend-client.ts` - 后端 API 客户端（积分系统相关）

**具体步骤**：
1. **检查即梦工厂页面功能**：
   - 打开 `app/dream-factory/page.tsx`
   - 检查页面是否能正常加载和显示
   - 检查 AI 视频生成功能是否正常工作
2. **检查 AI API 路由**：
   - 打开 `app/api/ai/*` 下的路由文件
   - 检查错误处理是否完整
   - 确保后端服务不可用时，AI 功能优雅降级
3. **检查积分系统**：
   - 检查积分消费逻辑是否正确
   - 确保积分不足时给出友好提示
   - 确保后端服务不可用时，积分系统优雅降级
4. **优化错误处理**：
   - 在 AI 功能中添加更友好的错误提示
   - 确保网络错误、API 错误等都能被正确处理
5. **测试用户体验**：
   - 测试完整的 AI 视频生成流程
   - 确认用户体验流畅，错误提示友好

**验收标准**：
- ✅ AI 视频生成功能正常工作
- ✅ 积分消费逻辑正确
- ✅ 错误处理友好（后端不可用时优雅降级）
- ✅ 用户体验流畅

**风险与回滚方式**：
- 🟡 **中等风险**：AI 功能依赖外部服务，可能有网络或服务可用性问题
- **回滚方式**：如果 AI 功能出现问题，恢复之前的代码

**AI/人工分工**：
- ✅ **AI 辅助**：AI 可以帮助优化错误处理和代码
- ⚠️ **人工 review**：需要人工实际测试 AI 功能，确认功能正常

---

## 输出 2：代码瘦身计划（Code Diet）

### 目标

减少历史债和无效复杂度，让后续迭代更容易、Cursor 更不容易"失忆乱改"。

### 瘦身范围划分

#### 1. 必须删除（Must Delete）

**backend-legacy 备份文件**：
- `backend-legacy/src/auth/auth.service.new.ts.backup`
- `backend-legacy/src/auth/auth.service.old.ts.backup`
- `backend-legacy/src/main.ts.fixed`
- `package.json.backup`（如果在项目根目录）

**理由**：备份文件不应该提交到代码库，应该使用 Git 版本控制。

#### 2. 可删除（Can Delete）

**未使用的脚本**（需要先确认是否被使用）：
- `scripts/test-user-identity-chain.ts` - 测试脚本，可能不再需要
- `scripts/verify-m3-system-status.ts` - 验证脚本，可能不再需要

**未使用的依赖**（需要先确认是否被使用）：
- 需要检查 package.json 中的依赖是否都被使用

#### 3. 先冻结（Freeze First）

**backend-legacy 目录**：
- 整个 `backend-legacy/` 目录应该被标记为冻结
- 在 `backend-legacy/README.md` 中添加冻结说明
- 在 `.gitignore` 中确保 `backend-legacy/dist/` 被忽略（应该已经存在）

### 删除/迁移清单

#### 阶段1：删除备份文件（立即执行）

**文件列表**：
1. `backend-legacy/src/auth/auth.service.new.ts.backup`
2. `backend-legacy/src/auth/auth.service.old.ts.backup`
3. `backend-legacy/src/main.ts.fixed`
4. `package.json.backup`（如果存在）

**安全删除流程**：
1. **确认文件未被引用**：
   ```bash
   # 检查备份文件是否被引用
   grep -r "auth.service.new.ts.backup" .
   grep -r "auth.service.old.ts.backup" .
   grep -r "main.ts.fixed" .
   grep -r "package.json.backup" .
   ```
   - 如果没有找到引用，可以安全删除
   - 如果找到引用，需要先处理引用关系
2. **备份到临时位置（可选）**：
   - 在删除前，可以先将文件移动到 `docs/_graveyard/` 目录（该目录已在 .gitignore 中）
3. **删除文件**：
   ```bash
   rm backend-legacy/src/auth/auth.service.new.ts.backup
   rm backend-legacy/src/auth/auth.service.old.ts.backup
   rm backend-legacy/src/main.ts.fixed
   rm package.json.backup  # 如果存在
   ```
4. **验证构建**：
   ```bash
   npm run build
   ```
   - 确认构建通过
5. **验证核心功能**：
   - 启动开发服务器：`npm run dev`
   - 访问首页，确认能正常加载
   - 访问资产列表页，确认能正常加载

**验收标准**：
- ✅ 备份文件已删除
- ✅ `npm run build` 构建通过
- ✅ 核心页面可以正常访问（首页、资产列表页）

---

#### 阶段2：标记 backend-legacy 为冻结（立即执行）

**操作**：
1. **检查前端对 backend-legacy 的依赖**：
   ```bash
   # 检查 lib/backend-client.ts 的使用情况
   grep -r "backend-client" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=backend-legacy
   
   # 检查 app/api/backend/ 路由的使用情况
   grep -r "api/backend" . --exclude-dir=node_modules --exclude-dir=.git
   ```
   - 确认前端代码中对 backend-legacy 的调用是否为可选功能
   - 如果调用是必需的，需要先处理依赖关系
2. 在 `backend-legacy/` 目录下创建或更新 `README.md`：
   ```markdown
   # backend-legacy - 已冻结

   **状态**：Frozen（冻结）/ Deprecated（已弃用）

   **说明**：
   - 此模块包含旧的 NestJS 后端服务代码，已冻结
   - 不做运维、不做健康检查、不纳入路线图
   - 未来如果体量/需求确实出现再评估

   **前端依赖**：
   - 前端代码中仍存在对 `lib/backend-client.ts` 的调用（主要在 `app/api/backend/` 和 `app/dashboard/page.tsx`）
   - 这些调用应为可选功能，后端不可用时应优雅降级，不影响核心功能
   ```
3. 确保 `.gitignore` 中包含：
   ```
   backend-legacy/dist/
   backend-legacy/node_modules/
   ```

**验收标准**：
- ✅ 已检查前端对 backend-legacy 的依赖情况
- ✅ `backend-legacy/README.md` 存在且包含冻结说明
- ✅ `.gitignore` 正确配置

---

#### 阶段3：检查并删除未使用的脚本（可选，第二周执行）

**脚本列表**（需要确认是否被使用）：
1. `scripts/test-user-identity-chain.ts`
2. `scripts/verify-m3-system-status.ts`

**安全删除流程**：
1. **检查脚本是否被引用**：
   ```bash
   # 检查 package.json 中是否有引用
   grep -i "test-user-identity-chain" package.json
   grep -i "verify-m3-system-status" package.json
   
   # 检查代码中是否有引用
   grep -r "test-user-identity-chain" .
   grep -r "verify-m3-system-status" .
   ```
2. **检查脚本功能**：
   - 阅读脚本代码，确认是否还在使用
   - 如果确认不再使用，可以删除
3. **删除脚本**（如果确认不再使用）：
   ```bash
   rm scripts/test-user-identity-chain.ts
   rm scripts/verify-m3-system-status.ts
   ```
4. **从 package.json 中删除相关脚本命令**（如果有）：
   - 删除 `"test:user-identity": "tsx scripts/test-user-identity-chain.ts"`
   - 删除 `"verify:m3": "tsx scripts/verify-m3-system-status.ts"`
5. **验证构建**：
   ```bash
   npm run build
   ```

**验收标准**：
- ✅ 未使用的脚本已删除
- ✅ package.json 中的相关脚本命令已删除（如果有）
- ✅ `npm run build` 构建通过

---

#### 阶段4：检查并删除未使用的依赖（可选，第二周执行）

**安全删除流程**：
1. **使用工具检查未使用的依赖**：
   ```bash
   # 安装 depcheck（如果还没有）
   npm install -g depcheck
   
   # 检查未使用的依赖
   depcheck
   ```
2. **手动确认**：
   - 对于每个标记为"未使用"的依赖，使用 grep 搜索代码库：
     ```bash
     grep -r "package-name" . --exclude-dir=node_modules
     ```
   - 如果确实没有找到使用，可以标记为"可删除"
3. **谨慎删除**：
   - 对于明确未使用的依赖，可以从 package.json 中删除
   - 删除后运行：
     ```bash
     npm install
     npm run build
     ```

**验收标准**：
- ✅ 未使用的依赖已从 package.json 中删除
- ✅ `npm install` 和 `npm run build` 正常

---

### 安全删除流程总结

**通用流程**：
1. **确认未引用**：使用 `grep` 搜索代码库，确认文件/依赖未被引用
2. **类型检查**：运行 `npm run build` 或 `tsc --noEmit`，确认没有类型错误
3. **构建验证**：运行 `npm run build`，确认构建通过
4. **功能验证**：启动开发服务器，访问核心页面，确认功能正常

**每一步的验收标准**：
- ✅ **grep 检查**：没有找到引用（或引用已处理）
- ✅ **类型检查**：`tsc --noEmit` 通过，没有类型错误
- ✅ **构建验证**：`npm run build` 通过，没有构建错误
- ✅ **功能验证**：核心页面可以正常访问（首页、资产列表页、资产详情页）

---

## 输出 3：风险清单

### 最可能翻车的 5 个点

#### 1. OSS 存储模式强制逻辑修改导致生产环境部署失败

**风险描述**：
- 在 `lib/storage.ts` 中添加生产环境强制 OSS 的逻辑后，如果逻辑有误，可能导致生产环境无法正常启动
- 或者如果现有生产环境配置不正确，强制检查会导致部署失败

**预防措施（具体动作）**：
1. **在修改前先检查当前生产环境配置**：
   - 登录 Vercel Dashboard
   - 检查生产环境的 `STORAGE_MODE` 和 `NEXT_PUBLIC_STORAGE_MODE` 环境变量
   - 确认它们都是 `oss`
2. **在测试环境先验证**：
   - 如果有测试环境，先在测试环境部署并验证
   - 如果没有测试环境，在本地模拟生产环境测试：
     ```bash
     NODE_ENV=production VERCEL=1 npm run build
     ```
3. **添加明确的错误消息**：
   - 如果检测到生产环境但存储模式不是 OSS，抛出明确的错误消息
   - 错误消息应包含修复建议：`"生产环境必须使用 OSS 模式，请检查 Vercel 环境变量配置"`
4. **准备回滚方案**：
   - 修改前创建 Git 分支：`git checkout -b feature/enforce-oss-in-production`
   - 如果部署后出现问题，立即回滚：`git revert <commit-hash>`

---

#### 2. NAS 路径展示功能修改导致资产详情页崩溃

**风险描述**：
- 在修改 NAS 路径展示逻辑时，如果代码有误，可能导致资产详情页无法正常显示
- 或者如果 NAS 路径为空时处理不当，可能导致页面崩溃

**预防措施（具体动作）**：
1. **修改前先检查现有代码**：
   - 使用 grep 搜索所有涉及 NAS 路径的代码：
     ```bash
     grep -r "guangzhouNas\|shenzhenNas" . --exclude-dir=node_modules
     ```
   - 理解现有代码逻辑，确保修改不会破坏现有功能
2. **添加空值检查**：
   - 在显示 NAS 路径的地方，先检查路径是否存在：
     ```typescript
     {asset.guangzhouNas && <div>广州NAS：{asset.guangzhouNas}</div>}
     ```
3. **在浏览器中实际测试**：
   - 启动开发服务器：`npm run dev`
   - 访问资产详情页，测试有 NAS 路径的资产
   - 测试没有 NAS 路径的资产（如果存在）
   - 确认页面正常显示，不会崩溃
4. **类型检查**：
   - 运行 `npm run build`，确认没有类型错误
   - 如果 TypeScript 报错，必须修复后再提交

---

#### 3. 错误处理逻辑导致真实错误被隐藏

**风险描述**：
- 在添加错误处理时，如果错误处理逻辑过于宽泛，可能导致真实的错误被捕获并隐藏
- 用户可能看不到真正的错误信息，导致问题难以排查

**预防措施（具体动作）**：
1. **区分错误类型**：
   - 用户输入错误：显示友好的错误提示
   - 系统错误（如网络错误、数据库错误）：记录日志，显示通用错误提示
   - 开发错误（如代码 bug）：在开发环境显示详细错误，生产环境显示通用错误
2. **保留错误日志**：
   - 在错误处理函数中，确保错误被记录（使用 `console.error` 或日志服务）
   - 即使向用户显示友好提示，也要记录原始错误
3. **测试各种错误场景**：
   - 测试网络错误（断开网络）
   - 测试 API 错误（返回 500 错误）
   - 测试数据库错误（如果适用）
   - 确认错误处理正确，不会导致页面崩溃
4. **代码审查**：
   - 在添加错误处理时，确保有经验的开发者审查代码
   - 确认错误处理逻辑不会隐藏关键错误

---

#### 4. 删除备份文件或脚本时误删仍在使用的文件

**风险描述**：
- 在代码瘦身时，如果误删了仍在使用的文件，可能导致构建失败或功能异常

**预防措施（具体动作）**：
1. **使用 grep 确认未引用**：
   - 对于每个要删除的文件，先使用 grep 搜索：
     ```bash
     grep -r "filename" . --exclude-dir=node_modules --exclude-dir=.git
     ```
   - 如果找到引用，不能删除，需要先处理引用关系
2. **检查 package.json**：
   - 对于脚本文件，检查 `package.json` 中的 `scripts` 字段
   - 确认脚本没有被引用
3. **类型检查**：
   - 删除文件后，运行 `tsc --noEmit` 或 `npm run build`
   - 如果出现类型错误，说明文件可能被使用，需要恢复
4. **分步删除**：
   - 不要一次性删除多个文件
   - 每次只删除一个文件，然后验证构建和功能
   - 确认没问题后再删除下一个

---

#### 5. 即梦工厂 AI 功能优化导致功能异常

**风险描述**：
- 在优化即梦工厂 AI 功能时，如果修改了关键逻辑，可能导致 AI 功能无法正常工作
- 或者如果错误处理过于激进，可能导致功能被误禁用
- 如果 backend-legacy 后端服务不可用，AI 功能需要能优雅降级

**预防措施（具体动作）**：
1. **理解现有代码逻辑**：
   - 在修改前，仔细阅读即梦工厂相关代码
   - 理解 AI 视频生成的完整流程
   - 理解积分消费的逻辑（通过 `lib/backend-client.ts` 调用 backend-legacy）
2. **检查 backend-legacy 依赖**：
   - 确认即梦工厂 AI 功能对 backend-legacy 的依赖情况
   - 如果依赖 backend-legacy，确保错误处理能优雅降级
   - 测试 backend-legacy 不可用时的降级场景
3. **保留原有逻辑作为回退**：
   - 在优化时，不要完全重写，而是逐步改进
   - 保留原有的核心逻辑，只优化错误处理和用户体验
4. **实际测试 AI 功能**：
   - 在修改后，实际测试 AI 视频生成功能
   - 测试完整的流程：上传图片 → 输入提示词 → 生成视频 → 查看结果
   - 确认功能正常工作
5. **检查降级逻辑**：
   - 确认 backend-legacy 后端服务不可用时，AI 功能能优雅降级
   - 测试降级场景（如断开网络或后端服务不可用），确认不会导致页面崩溃
   - 确认用户看到友好的错误提示，而不是技术错误信息
6. **代码审查**：
   - AI 功能是主价值模块，修改需要仔细审查
   - 确保有经验的开发者审查代码

---

## 总结

### 执行顺序建议

1. **第一周**：优先完成 P0 任务（环境变量校验、OSS 强制、Node 版本锁定、NAS 路径验证、基础错误处理）
2. **第二周**：完成 P1 任务（即梦工厂 AI 功能稳定）+ 代码瘦身（删除备份文件、标记 backend-legacy 为冻结）

### 关键原则

1. **小步快跑**：每次只修改一个模块，验证后再继续
2. **充分测试**：每个任务完成后，都要实际测试功能是否正常
3. **准备回滚**：重要修改前创建 Git 分支，出现问题立即回滚
4. **代码审查**：高风险修改需要人工审查，不能完全依赖 AI

