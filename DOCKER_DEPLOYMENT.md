# Docker部署指南

## 概述

本指南介绍如何使用Docker和Docker Compose部署随机抽取系统项目。Docker化部署可以简化环境配置，提高部署的一致性和可维护性。

## 前置要求

在开始之前，请确保您的服务器上已经安装了以下软件：

- Docker (版本20.10或更高)
- Docker Compose (版本2.0或更高)

### 安装Docker和Docker Compose

```bash
# 更新软件包列表
sudo apt update

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组（避免每次使用sudo）
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo apt install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

## 项目结构

```
john-memory/
├── backend/
│   ├── Dockerfile          # 后端Docker镜像构建文件
│   ├── .dockerignore       # 后端Docker构建忽略文件
│   ├── server.js           # 后端服务器代码
│   └── package.json        # 后端依赖配置
├── Dockerfile              # 前端Docker镜像构建文件
├── docker-compose.yml      # Docker Compose配置文件
├── nginx.conf             # Nginx配置文件
├── .dockerignore          # 前端Docker构建忽略文件
└── .env.example           # 环境变量示例文件
```

## 部署步骤

### 1. 克隆或上传项目到服务器

```bash
cd /var/www
# 如果使用git克隆
git clone <your-repo-url> john-memory
cd john-memory

# 或者直接上传项目文件到/var/www/john-memory目录
```

### 2. 配置环境变量

复制环境变量示例文件并修改配置：

```bash
cp .env.example .env
nano .env
```

修改`.env`文件中的以下配置：

```env
# MySQL配置
MYSQL_ROOT_PASSWORD=your_strong_root_password_here
DB_HOST=mysql
DB_USER=john_memory_user
DB_PASSWORD=your_strong_password_here
DB_NAME=john_memory

# 后端端口
PORT=3000
```

**重要提示**：
- 请将密码替换为强密码
- `MYSQL_ROOT_PASSWORD`是MySQL的root密码
- `DB_PASSWORD`是应用连接MySQL的密码

### 3. 停止旧的nginx+pm2服务（如果存在）

```bash
# 停止PM2管理的后端服务
cd /var/www/john-memory/backend
pm2 stop john-memory-backend
pm2 delete john-memory-backend

# 停止Nginx服务（如果不再需要）
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 4. 构建并启动Docker容器

```bash
cd /var/www/john-memory

# 构建并启动所有服务
docker compose up -d --build

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f
```

首次启动可能需要几分钟时间，因为需要：
- 下载Docker镜像
- 构建前端和后端镜像
- 初始化MySQL数据库

### 5. 验证部署

```bash
# 检查容器状态
docker compose ps

# 应该看到三个容器都在运行：
# - john-memory-mysql (mysql)
# - john-memory-backend (backend)
# - john-memory-frontend (frontend)

# 测试后端API
curl http://localhost:3000/api/lists

# 测试前端页面
curl http://localhost

# 或者直接在浏览器中访问
# http://your-server-ip
```

## 常用Docker Compose命令

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs

# 查看特定服务的日志
docker compose logs backend
docker compose logs frontend
docker compose logs mysql

# 实时查看日志
docker compose logs -f

# 重新构建并启动服务
docker compose up -d --build

# 进入容器内部
docker compose exec backend sh
docker compose exec mysql bash

# 查看资源使用情况
docker stats
```

## 数据备份与恢复

### 备份MySQL数据

```bash
# 备份MySQL数据库
docker compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} john_memory > backup_$(date +%Y%m%d_%H%M%S).sql

# 或者直接备份Docker volume
docker run --rm -v john-memory_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### 恢复MySQL数据

```bash
# 从SQL文件恢复
docker compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} john_memory < backup_20250111_120000.sql

# 从volume备份恢复
docker run --rm -v john-memory_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql_backup_20250111_120000.tar.gz -C /
```

## 故障排除

### 1. 容器无法启动

```bash
# 查看容器日志
docker compose logs backend
docker compose logs frontend
docker compose logs mysql

# 检查端口占用
sudo netstat -tlnp | grep -E '80|3000|3306'

# 检查Docker服务状态
sudo systemctl status docker
```

### 2. 数据库连接失败

```bash
# 检查MySQL容器状态
docker compose ps mysql

# 进入MySQL容器测试连接
docker compose exec mysql mysql -u root -p${MYSQL_ROOT_PASSWORD}

# 检查环境变量配置
docker compose config
```

### 3. 前端无法访问后端API

```bash
# 检查网络连接
docker compose exec frontend ping backend

# 检查Nginx配置
docker compose exec frontend cat /etc/nginx/conf.d/default.conf

# 检查后端服务
docker compose exec backend curl http://localhost:3000/api/lists
```

### 4. 端口冲突

如果端口80、3000或3306已被占用，可以修改`docker-compose.yml`中的端口映射：

```yaml
ports:
  - "8080:80"    # 将前端改为8080端口
  - "3001:3000"  # 将后端改为3001端口
  - "3307:3306"  # 将MySQL改为3307端口
```

### 5. 重新构建镜像

```bash
# 停止并删除所有容器
docker compose down

# 删除镜像
docker rmi john-memory-backend john-memory-frontend

# 重新构建并启动
docker compose up -d --build
```

## 性能优化

### 1. 资源限制

在`docker-compose.yml`中为容器设置资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 2. 数据库优化

修改MySQL配置以优化性能：

```yaml
services:
  mysql:
    command: --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    environment:
      MYSQL_INNODB_BUFFER_POOL_SIZE: 256M
      MYSQL_MAX_CONNECTIONS: 100
```

## 安全建议

1. **使用强密码**：确保所有密码都是强密码
2. **限制端口访问**：使用防火墙限制不必要的端口访问
3. **定期更新**：定期更新Docker镜像和系统
4. **监控日志**：定期检查容器日志，发现异常及时处理
5. **数据备份**：定期备份数据库数据

## 迁移说明

如果您之前使用nginx+pm2部署，迁移到Docker的步骤如下：

1. **备份数据**：备份MySQL数据库数据
2. **停止旧服务**：停止PM2和Nginx服务
3. **部署Docker**：按照上述步骤部署Docker
4. **恢复数据**：将备份的数据恢复到Docker MySQL容器
5. **测试验证**：测试所有功能是否正常

## 更新部署

当代码更新后，重新部署的步骤：

```bash
cd /var/www/john-memory

# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build

# 查看日志确认启动成功
docker compose logs -f
```

## 清理环境

如果需要完全清理Docker环境：

```bash
# 停止并删除所有容器
docker compose down

# 删除所有镜像
docker rmi $(docker images -q john-memory-*)
docker rmi $(docker images -q mysql)
docker rmi $(docker images -q nginx)
docker rmi $(docker images -q node)

# 删除所有volume（包括数据库数据，请谨慎操作）
docker volume rm john-memory_mysql_data

# 清理未使用的资源
docker system prune -a
```

## 联系支持

如果在部署过程中遇到问题，请查看：
1. 容器日志：`docker compose logs`
2. 项目文档：README.md
3. 后端服务器文档：backend/README_SERVER_SETUP.md
