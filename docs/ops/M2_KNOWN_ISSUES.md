# M2 已知问题说明

**更新时间：** 2024-12-19

---

## ⚠️ 问题 1: 生产环境 `/me` 接口返回 404

### 现象

- 后端登录成功
- 但是 `/me` 接口返回 404
- 前端 fallback 到 session 信息

### 原因

生产环境后端可能未部署 `MeController`，或者后端代码版本不同。

### 解决方案

**已实现：** `/api/me` 接口会自动尝试使用 `/credits/balance` 作为替代。

**代码位置：** `app/api/me/route.ts:26-55`

**行为：**
1. 首先尝试调用 `/me` 接口
2. 如果返回 404，尝试调用 `/credits/balance` 接口
3. 如果 `/credits/balance` 可用，返回部分用户信息（包括余额）
4. 如果都不可用，返回默认值（DRY_RUN 模式）

### 验证

刷新页面后，应该能看到：
- 余额信息（如果 `/credits/balance` 可用）
- 模式信息（默认 DRY_RUN）

---

## ⚠️ 问题 2: 页面显示 `admin@admin.local` 而不是后端 email

### 现象

页面右上角显示的是 `admin@admin.local`，而不是后端返回的 email（如 `test@factory-buy.com`）。

### 原因

这是**正常行为**：
1. 前端登录时使用的是 `admin@admin.local`（来自 `ADMIN_USERS`）
2. 后端登录使用的是 `test@factory-buy.com`（来自 `BACKEND_TEST_EMAIL`）
3. 前端显示的是 session 中的 email，不是后端返回的 email

### 说明

- **前端 session email：** `admin@admin.local`（用于前端显示）
- **后端登录 email：** `test@factory-buy.com`（用于后端认证）
- **后端 userId：** `test@factory-buy.com`（用于后端数据库查询）

这是**设计如此**，因为：
- 前端 session 和后端认证是分离的
- 使用 `BACKEND_TEST_EMAIL` 可以解决前后端 email 不匹配的问题
- 前端显示的是用户在前端登录时使用的 email

### 如果需要显示后端 email

可以修改前端逻辑，从 `/api/me` 返回的信息中获取 email：

```typescript
// app/dream-factory/page.tsx
const [userInfo, setUserInfo] = useState<{
  userId: string;
  email: string; // 使用后端返回的 email
  balance: number;
  billingMode: 'DRY_RUN' | 'REAL';
  modelMode: 'DRY_RUN' | 'REAL';
} | null>(null);
```

但这不是必需的，因为：
- 前端 session email 和后端 email 可以不同
- 只要后端认证成功，功能就能正常工作

---

## ✅ 当前状态

### 功能状态

- ✅ 后端登录成功
- ✅ 后端 token 获取成功
- ⚠️ `/me` 接口不可用（404），但已实现 fallback
- ✅ `/credits/balance` 接口可用（应该可用）

### 显示状态

- ✅ 页面显示用户信息（来自 session）
- ✅ 显示余额（如果 `/credits/balance` 可用）
- ✅ 显示模式信息（默认 DRY_RUN）

---

## 🔍 验证步骤

### 1. 检查 `/credits/balance` 是否可用

刷新页面后，查看控制台日志：
- 应该看到：`[API /me] ✅ 使用 /credits/balance 作为替代，获取到余额: XXX`
- 如果看到：`[API /me] /credits/balance 也不可用`，说明后端 `/credits/balance` 接口也不可用

### 2. 检查余额显示

页面右上角应该显示：
- 余额：`0` 或实际余额（如果 `/credits/balance` 可用）
- 模式：`🔒 DRY_RUN`（默认值）

### 3. 检查 AI 调用

尝试调用 AI 功能：
- 如果处于 Dry Run 模式，应该返回 mock 结果
- 不会产生真实费用

---

## 📝 建议

### 如果 `/credits/balance` 也不可用

**临时方案：**
- 前端会返回默认值（余额 0，DRY_RUN 模式）
- 功能仍然可用，但无法获取真实余额

**长期方案：**
- 更新生产环境后端代码，部署 `MeController`
- 或确保 `/credits/balance` 接口可用

### 如果需要显示后端 email

可以修改前端逻辑，但这不是必需的。

---

**文档结束**

