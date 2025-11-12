# 测试脚本使用说明

## 📦 上传压力测试

测试批量上传功能的稳定性。

### 快速开始

```bash
# 1. 启动服务器
npm run dev

# 2. 运行上传压力测试
npx tsx scripts/stress-test-upload.ts
```

### 测试内容
- ✅ 小批量上传 (10个文件)
- ✅ 中批量上传 (50个文件)  
- ✅ 大批量上传 (100个文件)
- ✅ 并发上传 (3个用户同时上传)

详细说明请参考 `STRESS_TEST.md`

---

## 📊 读取性能测试

测试大量数据下的页面加载和查询性能。

### 快速开始

```bash
# 1. 启动服务器
npm run dev

# 2. 生成测试数据（200个资产 + 100个素材）
npx tsx scripts/generate-test-data.ts

# 3. 运行性能测试
npx tsx scripts/test-read-performance.ts
```

### 自定义数据量

```bash
# 生成指定数量的测试数据
npx tsx scripts/generate-test-data.ts --assets=200 --materials=100
```

### 测试内容
- ✅ 基础API响应时间
- ✅ 查询API性能（带筛选）
- ✅ 分页性能（不同limit值）
- ✅ 并发查询性能
- ✅ 页面加载性能
- ✅ 内存使用监控

### 预期结果

- **优秀**: API响应 < 200ms
- **良好**: API响应 200-500ms
- **一般**: API响应 500-1000ms
- **较差**: API响应 > 1000ms

详细说明请参考 `PERFORMANCE_TEST.md`

---

## 注意事项

- 测试会创建真实的数据
- 建议在开发环境先测试
- 测试后可以清理测试数据（通过管理界面）

