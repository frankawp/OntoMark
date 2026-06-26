---
name: ontomark-serve
description: Wiki 预览服务器管理。当用户说"启动/停止/重启服务器/预览/serve"时由 ontomark 主技能分发。
---

# Serve 工作流

> 管理 Wiki 预览服务器，支持启动、停止、重启。

## 触发条件

- 用户输入：`/ontomark` + 含有"启动/停止/重启服务器/预览/serve"等关键词
- 或显式调用：`/ontomark-serve [action]`
- 或由 `/ontomark` 主技能分发

## 意图识别

| 用户输入 | 意图 | 操作 |
|---------|------|------|
| 启动服务器 / 预览 wiki / serve start | 启动 | 后台启动 HTTP 服务器 |
| 停止服务器 / 关闭预览 / serve stop | 停止 | 查找并杀死服务进程 |
| 重启服务器 / serve restart | 重启 | 先停止再启动 |
| 服务器状态 / serve status | 状态 | 检查服务是否运行中 |

## CLI 命令

```bash
# 启动服务器（前台运行，Ctrl+C 停止）
ontomark serve <project-path> --port 8080

# 启动服务器并自动打开浏览器
ontomark serve <project-path> --port 8080 --open

# 查看服务器状态
ontomark serve-status <project-path>
# 返回: { running, pid?, port?, started?, url? }

# 停止服务器
ontomark serve-stop <project-path>
# 返回: { success, message }
```

### CLI 命令参考

| 命令 | 作用 | 输出关键字段 |
|------|------|-------------|
| `ontomark serve <path>` | 启动服务器 | URL 输出 |
| `ontomark serve-status <path>` | 查看状态 | `running, pid?, port?, url?` |
| `ontomark serve-stop <path>` | 停止服务器 | `success, message` |

## 工作流程

### 第一步：检查前置条件

1. 检查项目是否已初始化：
   ```bash
   test -f <project-path>/.ontomark/config.json && echo "已初始化" || echo "未初始化"
   ```

2. 未初始化 → 提示运行 `/ontomark-init`，中止

### 第二步：解析意图

3. 分析用户输入，确定操作类型

### 第三步：执行操作

#### 启动服务器

4. 先检查端口是否被占用：
   ```bash
   # Windows
   netstat -ano | findstr :8080

   # Linux/macOS
   lsof -i :8080
   ```

5. 端口被占用 → 询问用户：
   - 换一个端口
   - 先停止现有服务（如果是 ontomark 的）

6. 后台启动服务器：
   ```bash
   # Linux/macOS
   nohup ontomark serve <project-path> --port 8080 > /tmp/ontomark-serve.log 2>&1 &

   # Windows (PowerShell)
   Start-Process -NoNewWindow ontomark -ArgumentList "serve","<project-path>","--port","8080" -RedirectStandardOutput "$env:TEMP\ontomark-serve.log" -RedirectStandardError "$env:TEMP\ontomark-serve-error.log"
   ```

7. 保存 PID 到 `.ontomark/serve.pid`：
   ```bash
   echo $! > <project-path>/.ontomark/serve.pid
   ```

8. 等待 1 秒后检查服务是否启动成功：
   ```bash
   sleep 1 && curl -s http://localhost:8080 > /dev/null && echo "OK" || echo "FAIL"
   ```

9. 向用户展示：
   ```
   🌐 Wiki 预览服务器已启动

   地址: http://localhost:8080
   项目: <project-path>

   停止服务: /ontomark-serve stop
   查看状态: /ontomark-serve status
   ```

#### 停止服务器

4. 检查是否有 PID 文件：
   ```bash
   cat <project-path>/.ontomark/serve.pid 2>/dev/null
   ```

5. 有 PID 文件 → 尝试杀死进程：
   ```bash
   kill <pid> 2>/dev/null || echo "进程已不存在"
   rm <project-path>/.ontomark/serve.pid
   ```

6. 无 PID 文件 → 按端口查找进程：
   ```bash
   # Linux/macOS
   lsof -ti:8080 | xargs kill 2>/dev/null

   # Windows
   for /f "tokens=5" %a in ('netstat -ano ^| findstr :8080') do taskkill /F /PID %a
   ```

7. 向用户确认：
   ```
   ✅ Wiki 预览服务器已停止
   ```

#### 重启服务器

4. 先执行停止流程
5. 等待 1 秒
6. 执行启动流程

#### 查看状态

4. 检查服务是否运行：
   ```bash
   curl -s http://localhost:8080/api/index > /dev/null && echo "running" || echo "stopped"
   ```

5. 展示状态：
   ```
   📊 Wiki 预览服务器状态

   状态: 运行中 / 已停止
   地址: http://localhost:8080
   项目: <project-path>
   PID: <pid>（如运行中）

   实体数量: <count>
   最后更新: <timestamp>
   ```

### 第四步：后续操作

10. 询问用户是否需要其他操作：
    ```
    要在浏览器中打开吗？
    A. 打开 http://localhost:8080
    B. 完成
    ```

## 配置文件

服务器运行时会创建以下文件：

- `.ontomark/serve.pid` — 保存进程 ID
- `.ontomark/serve.log` — 标准输出日志（可选）
- `.ontomark/serve-error.log` — 错误日志（可选）

## 端口冲突处理

| 场景 | 处理 |
|------|------|
| 端口被其他程序占用 | 建议换端口 |
| 端口被 ontomark 占用（其他项目） | 询问是否停止现有服务 |
| 同项目已在运行 | 返回"服务器已在运行" |

## 错误处理

| 场景 | 处理 |
|------|------|
| `.ontomark/config.json` 不存在 | 提示运行 `/ontomark-init`，中止 |
| 启动失败 | 检查日志，提示端口或路径问题 |
| 停止失败（进程不存在） | 清理 PID 文件，提示已停止 |
| 非预期错误 | 展示错误信息，建议手动排查 |

## 跨平台兼容

技能需要处理不同操作系统的命令差异：

| 操作 | Linux/macOS | Windows |
|------|-------------|---------|
| 后台启动 | `nohup ... &` | `Start-Process -NoNewWindow` |
| 查端口 | `lsof -i :PORT` | `netstat -ano \| findstr :PORT` |
| 杀进程 | `kill PID` | `taskkill /F /PID PID` |
| 检查服务 | `curl -s URL` | `curl -s URL`（PowerShell） |

## 输出报告

```markdown
## 服务器操作完成

操作: 启动 / 停止 / 重启
状态: 成功 / 失败
地址: http://localhost:8080（如运行中）

下一步:
- 浏览器打开: http://localhost:8080
- 停止服务: /ontomark-serve stop
```
