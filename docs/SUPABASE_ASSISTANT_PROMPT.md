# Supabase 助手提示词

## 提示词（直接复制给 Supabase 助手）

```
我需要为我的 Next.js 应用配置 Supabase 环境变量。请告诉我：

1. 如何在我的 Supabase 项目中找到以下值：
   - Project URL（用于 NEXT_PUBLIC_SUPABASE_URL）
   - anon public key（用于 NEXT_PUBLIC_SUPABASE_ANON_KEY）
   - service_role key（用于 SUPABASE_SERVICE_ROLE_KEY）

2. 这些值在 Supabase Dashboard 的哪个位置？

3. 是否有安全注意事项？特别是 service_role key 的使用。

4. 如果我的项目还没有创建，请告诉我如何创建一个新的 Supabase 项目。

请用中文回答，并提供详细的步骤说明。
```

## 或者更详细的提示词

```
你好，我是 Supabase 的新用户，正在配置一个 Next.js 16 应用。

我的应用需要从 Supabase 数据库读取资产数据，需要配置以下环境变量：
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY

请详细告诉我：
1. 这些值分别在哪里可以找到？
2. 在 Supabase Dashboard 中的具体操作步骤是什么？
3. service_role key 和 anon key 有什么区别？为什么需要两个？
4. 这些 key 的安全性如何？需要注意什么？
5. 如果我的数据库表名是 "assets"，如何验证连接是否正常？

请提供截图说明或详细的步骤指引。
```

## 快速版本（如果助手支持）

```
请告诉我如何获取 Supabase 项目的：
1. Project URL
2. anon public key
3. service_role key

这些值在 Dashboard 的哪个位置？请用中文详细说明步骤。
```

