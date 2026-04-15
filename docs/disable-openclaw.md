# openclaw-gateway 运维手册

## root 用户 openclaw 日常管理

### 重启服务
```bash
systemctl --user restart openclaw-gateway
```

### 停止服务
```bash
systemctl --user stop openclaw-gateway
```

### 启动服务
```bash
systemctl --user start openclaw-gateway
```

### 查看状态
```bash
systemctl --user status openclaw-gateway
```

### 查看日志

日志已配置持久化到文件（通过 systemd StandardOutput/StandardError）：

```bash
# 实时跟踪主日志
tail -f ~/.openclaw/logs/gateway.log

# 实时跟踪错误日志
tail -f ~/.openclaw/logs/gateway-error.log

# 查看最近 100 行主日志
tail -100 ~/.openclaw/logs/gateway.log

# 搜索飞书相关日志
grep -i feishu ~/.openclaw/logs/gateway.log | tail -20

# 搜索错误关键字
grep -iE "error|fail|timeout" ~/.openclaw/logs/gateway.log | tail -20

# 按时间范围查看（如今天的日志）
grep "$(date +%Y-%m-%d)" ~/.openclaw/logs/gateway.log | tail -50
```

日志文件路径：
- 主日志：`~/.openclaw/logs/gateway.log`
- 错误日志：`~/.openclaw/logs/gateway-error.log`
- 配置审计：`~/.openclaw/logs/config-audit.jsonl`
- 配置健康：`~/.openclaw/logs/config-health.json`

> journalctl 在此服务器无日志输出，请使用上面的文件日志方式。

### 服务配置

service 文件位置：`~/.config/systemd/user/openclaw-gateway.service`

修改后需重载：
```bash
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway
```

### 常见排查

**飞书不回复消息：**
1. 先查状态：`systemctl --user status openclaw-gateway`
2. 看日志是否有消息进来：`grep feishu ~/.openclaw/logs/gateway.log | tail -10`
3. 看是否有卡住的子进程：`ps aux | grep openclaw`
4. 如有卡住的 curl 子进程，杀掉释放队列：`pkill -P $(pgrep openclaw-gateway) curl`
5. 最终手段重启：`systemctl --user restart openclaw-gateway`

**日志文件过大清理：**
```bash
# 查看日志大小
du -sh ~/.openclaw/logs/*

# 清空但保留文件（不影响正在写入的服务）
truncate -s 0 ~/.openclaw/logs/gateway.log
truncate -s 0 ~/.openclaw/logs/gateway-error.log
```

> **注意：** root 已启用 `loginctl enable-linger`，服务在 SSH 断开后仍会持续运行。

---

# 禁用 admin 用户的 openclaw-gateway

## 一次性执行（彻底禁用）

> 推荐直接用下面的 **终极方案**，比第一版更彻底。

### 终极方案：mask 服务（推荐）

```bash
pkill -9 -u admin openclaw-gateway 2>/dev/null
rm -f /home/admin/.config/systemd/user/default.target.wants/openclaw-gateway.service
ln -sf /dev/null /home/admin/.config/systemd/user/openclaw-gateway.service
loginctl disable-linger admin
```

**原理：** 将 service 文件替换为指向 `/dev/null` 的软链接，systemd 读到后永久拒绝启动，无论手动触发还是开机自启都无效。

### 基础方案（仅删软链接，有可能复活）

```bash
pkill -u admin openclaw-gateway
rm -f /home/admin/.config/systemd/user/default.target.wants/openclaw-gateway.service
loginctl disable-linger admin
```

> `daemon-reload` 报 "No such file or directory" 可忽略，不影响结果。

---

## 验证是否彻底禁用

```bash
pgrep -u admin openclaw-gateway && echo "还在运行！" || echo "已停止"
ls -la /home/admin/.config/systemd/user/openclaw-gateway.service
```

第二条应显示 `-> /dev/null`，说明已 mask。

---

## 检查是否复活

```bash
pgrep -u admin openclaw-gateway && echo "还在运行！" || echo "已停止"
ls /home/admin/.config/systemd/user/default.target.wants/ 2>/dev/null || echo "目录为空"
```

---

## 如果复活了，按以下顺序排查

**1. 确认 mask 是否还在**
```bash
ls -la /home/admin/.config/systemd/user/openclaw-gateway.service
```
如果不是指向 `/dev/null`，重新执行终极方案。

**2. 检查是否有 cron 任务在拉起**
```bash
crontab -u admin -l
```
如果有相关条目，用 `crontab -u admin -e` 删除。

**3. 检查是否有系统级 systemd 服务在拉起**
```bash
grep -r "openclaw" /etc/systemd/system/ 2>/dev/null
```
如果有，禁用对应服务：
```bash
systemctl disable --now <服务名>
```

**4. 确认 linger 已关闭**
```bash
loginctl show-user admin | grep Linger
```
应显示 `Linger=no`，否则再执行：
```bash
loginctl disable-linger admin
```
