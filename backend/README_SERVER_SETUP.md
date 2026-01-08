# 服务器MySQL安装与配置指南

## 1. 安装MySQL

在Ubuntu服务器上安装MySQL 8.0：

```bash
# 更新软件包列表
sudo apt update

# 安装MySQL服务器
sudo apt install -y mysql-server

# 启动MySQL服务并设置开机自启
sudo systemctl start mysql
sudo systemctl enable mysql

# 查看MySQL服务状态
sudo systemctl status mysql
```

## 2. 配置MySQL

### 2.1 安全初始化

运行MySQL安全初始化脚本：

```bash
sudo mysql_secure_installation
```

按照提示执行以下操作：
- 设置root密码
- 移除匿名用户
- 禁止root远程登录
- 移除测试数据库
- 重新加载权限表

### 2.2 创建数据库和用户

登录MySQL：

```bash
mysql -u root -p
```

执行以下SQL命令：

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS john_memory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（请替换your_password为强密码）
CREATE USER 'john_memory_user'@'localhost' IDENTIFIED BY 'your_password';

-- 授予权限
GRANT ALL PRIVILEGES ON john_memory.* TO 'john_memory_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出MySQL
EXIT;
```

## 3. 配置项目环境变量

在项目根目录创建`.env`文件：

```bash
cd /var/www/john-memory/backend
touch .env
```

编辑`.env`文件：

```bash
nano .env
```

添加以下内容（替换为实际的数据库配置）：

```
# 数据库配置
DB_HOST=localhost
DB_USER=john_memory_user
DB_PASSWORD=your_password
DB_NAME=john_memory

# 服务器端口
PORT=3000
```

## 4. 安装项目依赖

```bash
# 安装依赖
npm install

# 或使用yarn
yarn install
```

## 5. 启动后端服务

```bash
# 使用PM2启动服务
npm run pm2:start

# 查看服务状态
npm run pm2:status

# 查看日志
npm run pm2:logs
```

## 6. 测试API

使用curl或Postman测试API是否正常工作：

```bash
# 测试获取列表
curl http://localhost:3000/api/lists

# 测试创建列表
curl -X POST -H "Content-Type: application/json" -d '{"name":"测试列表"}' http://localhost:3000/api/lists

# 测试创建条目
curl -X POST -H "Content-Type: application/json" -d '{"text":"测试条目","listId":1}' http://localhost:3000/api/items
```

## 7. 故障排除

### 7.1 MySQL连接失败

- 检查MySQL服务是否运行：`sudo systemctl status mysql`
- 检查用户名和密码是否正确
- 检查数据库是否存在：`mysql -u root -p -e "SHOW DATABASES;"`

### 7.2 API返回500错误

- 查看PM2日志：`npm run pm2:logs`
- 检查MySQL错误日志：`sudo tail -f /var/log/mysql/error.log`
- 确保.env文件配置正确

## 8. 数据迁移（可选）

如果需要从SQLite迁移现有数据，请参考[README_MIGRATION.md](README_MIGRATION.md)文件。
