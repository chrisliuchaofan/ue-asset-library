# Docker 数据库设置完成 ✅

## 🎉 设置成功

### ✅ 已完成

1. **PostgreSQL 容器已创建并运行**
   - 容器名称：`ue-assets-db`
   - 镜像：`postgres:15`
   - 端口：`5432`

2. **数据库配置已更新**
   - 文件：`backend-api/.env`
   - 配置信息：
     ```bash
     DB_HOST=localhost
     DB_PORT=5432
     DB_USERNAME=ue_user
     DB_PASSWORD=ue_password
     DB_NAME=ue_assets
     ```

3. **数据库连接测试成功**
   - ✅ PostgreSQL 15.15 运行正常
   - ✅ 数据库 `ue_assets` 已创建
   - ✅ 用户 `ue_user` 已创建

---

## 📋 数据库信息

**连接信息：**
- **主机：** `localhost`
- **端口：** `5432`
- **数据库名：** `ue_assets`
- **用户名：** `ue_user`
- **密码：** `ue_password`

**⚠️ 注意：** 这是开发环境的默认密码，生产环境请使用强密码。

---

## 🧪 测试数据库连接

### 方法 1：使用 psql 命令行

```bash
# 从容器内连接
docker exec -it ue-assets-db psql -U ue_user -d ue_assets

# 或从本地连接（如果安装了 psql）
psql -h localhost -U ue_user -d ue_assets
# 密码：ue_password
```

### 方法 2：启动后端服务

```bash
cd backend-api
npm run start:dev
```

**查看日志：**
- ✅ 如果看到 "数据库连接成功" 或没有数据库错误，说明配置正确
- ✅ TypeORM 会自动创建表（如果 `synchronize: true`）

---

## 🛠️ 常用 Docker 命令

```bash
# 查看容器状态
docker ps | grep ue-assets-db

# 查看容器日志
docker logs ue-assets-db

# 停止容器
docker stop ue-assets-db

# 启动容器
docker start ue-assets-db

# 重启容器
docker restart ue-assets-db

# 删除容器（⚠️ 会删除所有数据）
docker rm -f ue-assets-db
```

---

## 📝 数据持久化

**当前配置：** 数据存储在容器内，删除容器会丢失数据。

**如果需要持久化数据：**

```bash
# 停止并删除现有容器
docker stop ue-assets-db
docker rm ue-assets-db

# 使用数据卷重新创建
docker run --name ue-assets-db \
  -e POSTGRES_USER=ue_user \
  -e POSTGRES_PASSWORD=ue_password \
  -e POSTGRES_DB=ue_assets \
  -p 5432:5432 \
  -v ue-assets-db-data:/var/lib/postgresql/data \
  -d postgres:15
```

**查看数据卷：**
```bash
docker volume ls | grep ue-assets
```

---

## ✅ 下一步

1. **测试后端服务**
   ```bash
   cd backend-api
   npm run start:dev
   ```

2. **检查数据库表**
   - 启动后端后，TypeORM 会自动创建表
   - 使用 `docker exec -it ue-assets-db psql -U ue_user -d ue_assets` 连接
   - 运行 `\dt` 查看所有表

3. **推送代码到 GitHub**
   ```bash
   git push origin main
   ```

---

## ⚠️ 重要提示

1. **生产环境**
   - 不要使用默认密码
   - 使用云数据库（阿里云 RDS）更稳定
   - 配置数据备份

2. **数据备份**
   ```bash
   # 备份数据库
   docker exec ue-assets-db pg_dump -U ue_user ue_assets > backup.sql
   
   # 恢复数据库
   cat backup.sql | docker exec -i ue-assets-db psql -U ue_user ue_assets
   ```

3. **服务器部署**
   - 服务器上也需要配置数据库
   - 可以使用相同的 Docker 命令
   - 或使用云数据库（推荐）







