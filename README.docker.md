# Docker部署说明

本文档提供使用Docker部署创新工坊预约系统的详细说明。

## 系统架构

系统由两个主要组件组成，它们在同一个容器中运行：

1. **FastAPI后端服务**：提供API接口，处理预约逻辑
2. **Flask管理系统**：提供管理界面，用于管理用户、设备、场地等

## 前置条件

- 安装Docker和Docker Compose
  ```bash
  # 安装Docker (Ubuntu)
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh

  # 安装Docker Compose
  sudo apt-get install docker-compose-plugin
  ```

## 快速部署

1. **克隆代码库**

   ```bash
   git clone [仓库地址]
   cd [项目目录]
   ```
2. **创建.env文件（可选）**

   ```bash
   # 复制示例环境变量文件
   cp .env.example .env

   # 编辑.env文件，填入您的实际配置
   nano .env
   ```

   > **安全提示**: .env文件包含敏感信息，不会被包含在Docker镜像中。每个部署环境需要提供自己的.env文件。
3. **构建并启动服务**

   ```bash
   docker-compose up -d --build
   ```

   系统会自动:

   - 启动FastAPI和Flask服务
   - 创建必要的数据库
   - 创建管理员账号（用户名: admin, 密码: admin123）
4. **访问服务**

   - 管理系统：http://localhost:5000
   - API服务：http://localhost:8001

## 查看日志

```bash
# 查看所有日志
docker-compose logs -f

# 查看特定服务的日志
docker-compose logs -f reservation-system
```

## 停止服务

```bash
docker-compose down
```

## 数据持久化

系统使用Docker卷来持久化数据：

- `app-data`：存储整个应用目录，包括自动生成的数据库文件

数据库文件位置：

- FastAPI数据库：`/app/app.db`
- 管理系统数据库：`/app/admin_system/instance/admin.db`

## 备份数据

```bash
# 创建备份目录
mkdir -p backup

# 备份数据库
docker run --rm -v reservation-system_app-data:/app -v $(pwd)/backup:/backup alpine sh -c "cp /app/app.db /backup/app_$(date +%Y%m%d).db && cp /app/admin_system/instance/admin.db /backup/admin_$(date +%Y%m%d).db"
```

## 恢复数据

```bash
# 恢复数据库
docker run --rm -v reservation-system_app-data:/app -v $(pwd)/backup:/backup alpine sh -c "cp /backup/app_20230101.db /app/app.db && cp /backup/admin_20230101.db /app/admin_system/instance/admin.db"
```

## 故障排除

1. **服务无法启动**

   ```bash
   # 查看容器状态
   docker-compose ps

   # 查看详细日志
   docker-compose logs
   ```
2. **数据库错误**

   ```bash
   # 进入容器
   docker-compose exec reservation-system sh

   # 检查数据库
   ls -la
   ls -la admin_system/instance/
   ```
3. **网络问题**

   ```bash
   # 检查网络
   docker network ls
   docker network inspect reservation-system_reservation-network
   ```

## 更新部署

当代码有更新时，按照以下步骤更新部署：

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 安全建议

1. 修改默认密码
2. 在生产环境中使用HTTPS
3. 定期备份数据
4. 限制Docker容器的资源使用

## 推送到Docker Hub

您可以将镜像推送到Docker Hub，以便在其他环境中使用：

1. **登录Docker Hub**
   ```bash
   docker login
   ```

2. **为镜像添加标签**
   ```bash
   docker tag reservation-system:latest 您的用户名/reservation-system:latest
   ```

3. **推送镜像**
   ```bash
   docker push 您的用户名/reservation-system:latest
   ```

> **安全提示**:
> - 推送前确保已添加`.dockerignore`文件，排除敏感文件如`.env`
> - 镜像中不应包含任何敏感信息
> - 使用卷挂载来提供环境变量和持久化数据
