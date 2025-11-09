# OSS 权限问题解决方案

## 错误信息
```
You have no right to access this object because of bucket acl
```

这个错误表示你的 AccessKey 没有权限写入 OSS Bucket。

## 解决方案

### 方案 1：检查 Bucket ACL 设置（推荐）

1. **登录阿里云 OSS 控制台**
   - 进入 [OSS 控制台](https://oss.console.aliyun.com/)
   - 找到你的 Bucket：`guangzhougamead`

2. **检查 Bucket 权限**
   - 点击 Bucket 名称进入详情
   - 点击左侧菜单 "权限管理" → "读写权限"
   - 确保当前账号有读写权限

3. **如果使用 RAM 子账号**
   - 需要确保 RAM 子账号被授予该 Bucket 的读写权限
   - 在 RAM 控制台检查子账号的权限策略

### 方案 2：修改 Bucket ACL（临时测试用）

⚠️ **注意：此方法仅用于测试，生产环境不推荐**

1. 在 OSS 控制台，进入你的 Bucket
2. 点击 "权限管理" → "读写权限"
3. 将 "读写权限" 设置为：
   - **公共读**（用于测试，允许读取）
   - 或者确保你的账号在 "授权用户" 列表中

### 方案 3：使用 RAM 子账号并授予正确权限（推荐用于生产）

1. **创建 RAM 子账号**
   - 登录 [RAM 控制台](https://ram.console.aliyun.com/)
   - 创建新用户，生成 AccessKey

2. **创建自定义权限策略**
   ```json
   {
     "Version": "1",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "oss:GetObject",
           "oss:PutObject",
           "oss:DeleteObject",
           "oss:ListObjects"
         ],
         "Resource": [
           "acs:oss:*:*:guangzhougamead",
           "acs:oss:*:*:guangzhougamead/*"
         ]
       }
     ]
   }
   ```

3. **将策略授权给子账号**
   - 在 RAM 控制台，找到创建的子账号
   - 点击 "添加权限"
   - 选择刚创建的自定义策略

4. **使用子账号的 AccessKey**
   - 更新 `.env.local` 中的 `OSS_ACCESS_KEY_ID` 和 `OSS_ACCESS_KEY_SECRET`

### 方案 4：检查 AccessKey 是否为主账号

如果使用的是主账号的 AccessKey：
1. 确保主账号有该 Bucket 的完全控制权限
2. 或者按照方案 3 使用 RAM 子账号（更安全）

## 快速检查清单

- [ ] Bucket 名称是否正确：`guangzhougamead`
- [ ] AccessKey ID 和 Secret 是否正确
- [ ] AccessKey 对应的账号是否有该 Bucket 的读写权限
- [ ] Bucket 的 ACL 设置是否允许当前账号访问
- [ ] 如果使用 RAM 子账号，是否已授予正确的权限策略

## 验证权限

修复权限后，可以尝试：

1. **重启开发服务器**
   ```bash
   npm run dev
   ```

2. **在后台管理页面创建测试资产**
   - 访问 `http://localhost:3001/admin`
   - 填写表单并创建资产

3. **检查 OSS 控制台**
   - 进入 Bucket，查看是否有 `manifest.json` 文件
   - 如果文件存在，说明权限已修复

## 常见问题

### Q: 为什么会出现这个错误？
A: OSS 的访问控制基于 ACL（访问控制列表）。如果 Bucket 的 ACL 设置为私有，只有被授权的账号才能访问。你的 AccessKey 可能没有被授权。

### Q: 使用主账号的 AccessKey 安全吗？
A: 不推荐。建议使用 RAM 子账号，并授予最小必要权限。

### Q: 如何查看当前 AccessKey 的权限？
A: 在 RAM 控制台 → 身份管理 → 用户，找到对应的用户，查看"权限"标签页。


