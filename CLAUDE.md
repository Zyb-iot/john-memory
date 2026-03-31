# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供指引。

## 项目概述

**john-memory**（随机抽取系统）是一个支持随机抽取功能的全栈列表/条目管理应用。技术栈：Vue 3 + Vite 前端、Express.js 后端、MySQL 8.0 数据库、Docker Compose 编排。

## 开发命令

### 前端（在项目根目录或 `frontend/` 下执行）
```bash
npm run dev      # 启动 Vite 开发服务器，监听 localhost:5173，将 /api/* 代理到 localhost:3000
npm run build    # 构建到 frontend/dist/
npm run preview  # 预览生产构建结果
```

### 后端（在 `backend/` 下执行）
```bash
npm start        # 启动 Express 服务器，端口 3000
npm run dev      # 使用 nodemon 启动（文件变更自动重启）
```

### Docker（在项目根目录执行——生产环境推荐）
```bash
docker compose up -d --build   # 构建并启动所有服务
docker compose down            # 停止并移除容器
docker compose logs -f         # 实时查看日志
docker compose exec backend sh # 进入后端容器 Shell
```

## 环境配置

运行 Docker 前，将 `.env.example` 复制为项目根目录的 `.env`：
```
MYSQL_ROOT_PASSWORD=...
DB_HOST=mysql          # 本地非 Docker 开发时改为 "localhost"
DB_USER=john_memory_user
DB_PASSWORD=...
DB_NAME=john_memory
PORT=3000
```

## 架构说明

### 数据流
- **开发环境：** 浏览器 → Vite 开发服务器 (5173) → [代理 `/api/*`] → Express (3000) → MySQL
- **生产环境（Docker）：** 浏览器 → Nginx 容器 → 后端容器 → MySQL 容器（均在 `john-memory-network` 网络内）

### 前端（`frontend/src/`）
- `App.vue` — 根组件，在 `L-app.vue`（当前激活）和 `CrudApp.vue` 之间切换
- `components/L-app.vue` — 主界面（列表管理、条目增删改查、随机抽取）
- `components/CrudApp.vue` — 备用完整功能界面
- `api/itemApi.js` — 所有 HTTP 请求通过 axios 封装，使用相对路径 `/api`（开发和生产均适用）
- 每 5 秒轮询一次，实现多客户端实时同步

### 后端（`backend/server.js`）
单文件 Express 应用。启动时自动创建数据库表结构，并初始化默认列表（id=1，name='默认列表'）。连接池上限为 10。

REST 接口：
- `GET/POST /api/lists` — 列表增删改查
- `PUT/DELETE /api/lists/:id` — 更新/删除列表（删除时该列表下的条目自动归入 id=1 的默认列表）
- `GET/POST /api/items` — 条目增删改查（GET 支持 `?listId=X` 过滤）
- `PUT/DELETE /api/items/:id` — 更新/删除条目

### 数据库结构
```sql
lists:  id, name, createdAt, updatedAt
items:  id, text, listId (FK→lists.id 默认值1), isHidden (0/1), createdAt, updatedAt
```
id=1 的默认列表不可删除。隐藏条目不参与随机抽取。

### Docker 架构
- `frontend` 容器：多阶段构建（Node 18 → Nginx Alpine），提供静态资源并反向代理后端
- `backend` 容器：Node 18 Alpine 运行 Express
- `mysql` 容器：MySQL 8.0，含健康检查；后端通过 `depends_on` 等待其就绪
- 持久化卷：`mysql_data`
