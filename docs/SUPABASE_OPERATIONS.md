# Supabase 操作手册

> 本文档供 AI 编辑器和开发者参考，包含 Supabase 本地操作的完整指南。

---

## 快速参考

| 操作 | 命令 |
|------|------|
| 生成类型定义 | `npm run gen:types` |
| 执行 SQL 文件 | `node scripts/execute-sql.js sql/xxx.sql` |

---

## 代理配置（重要！）

**中国大陆访问 Supabase 必须配置代理！**

### 默认代理设置
```
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

### 如果你的代理端口不同
修改以下文件中的代理地址：
- `scripts/gen-types.js` 第 10 行
- `scripts/execute-sql.js` 第 10 行

### 代理软件要求
- Clash / V2Ray / Shadowsocks 等均可
- 确保代理软件正在运行
- 确保端口正确（Clash 默认 7890）

---

## 环境变量配置

在 `.env.local` 中需要以下配置：

```env
# Supabase 基础配置
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key

# 执行 SQL 必需！
SUPABASE_SERVICE_ROLE_KEY=你的service_role_key

# 代理配置（可选，默认使用 127.0.0.1:7890）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

### 获取 Service Role Key
1. 访问 https://supabase.com/dashboard
2. 选择项目 → Settings → API
3. 复制 `service_role` key
4. ⚠️ **注意：此 key 有完全权限，不要泄露或提交到 Git！**

---

## 常用命令

### 1. 生成 TypeScript 类型定义

从云端数据库拉取最新的表结构，生成类型定义文件。

```bash
npm run gen:types
```

**输出文件：** `lib/database.types.ts`

**使用场景：**
- 云端修改了数据库结构后
- 需要类型提示时

### 2. 执行 SQL 文件到云端

```bash
node scripts/execute-sql.js sql/你的文件.sql
```

**示例：**
```bash
node scripts/execute-sql.js sql/test.sql
node scripts/execute-sql.js sql/seed_workout_plans.sql
```

---

## 文件结构

```
fitcore/
├── .env.local                    # 环境变量配置
├── lib/
│   ├── database.types.ts         # 自动生成的类型定义
│   └── supabaseClient.ts         # Supabase 客户端
├── sql/                          # SQL 文件目录
│   ├── test.sql                  # 测试 SQL
│   ├── seed_workout_plans.sql    # 训练计划数据
│   ├── database_changes.sql      # 数据库结构变更
│   └── ...                       # 其他 SQL 文件
├── scripts/
│   ├── gen-types.js              # 生成类型定义脚本
│   ├── execute-sql.js            # 执行 SQL 脚本
│   └── install-supabase-cli.ps1  # 安装 Supabase CLI
└── supabase/
    └── config.toml               # Supabase CLI 配置
```

---

## Supabase CLI 命令参考

如果需要使用 Supabase CLI（已安装在 node_modules）：

```powershell
# 设置代理（必须！）
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"

# 查看版本
.\node_modules\supabase\bin\supabase.exe --version

# 登录
.\node_modules\supabase\bin\supabase.exe login

# 生成类型
.\node_modules\supabase\bin\supabase.exe gen types --linked --lang=typescript

# 查看项目状态
.\node_modules\supabase\bin\supabase.exe status
```

---

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `exercises` | 动作库 |
| `workout_plans` | 训练计划 |
| `workout_days` | 训练日 |
| `plan_exercises` | 计划中的动作 |
| `workout_sessions` | 训练会话记录 |
| `set_logs` | 组记录 |
| `personal_records` | 个人记录 (PR) |
| `user_settings` | 用户设置 |
| `daily_stats` | 每日统计 |
| `chat_messages` | 聊天消息 |
| `knowledge_base` | 知识库 |

---

## 故障排除

### 1. 连接超时 / 网络错误

**症状：** `ConnectTimeoutError`、`ETIMEDOUT`

**解决方案：**
1. 确保代理软件正在运行
2. 检查代理端口是否正确（默认 7890）
3. 尝试在浏览器中访问 https://supabase.com 确认代理正常

### 2. Supabase CLI 未安装

**症状：** `无法将"supabase"项识别为 cmdlet`

**解决方案：**
```powershell
# 设置代理后重新安装
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
npm install supabase --save-dev --ignore-scripts
cd node_modules\supabase
node scripts/postinstall.js
```

### 3. 环境变量未加载

**症状：** `NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set`

**解决方案：**
1. 确保 `.env.local` 文件存在于项目根目录
2. 检查变量名是否正确（注意大小写）
3. 重启终端后重试

### 4. 类型文件乱码

**症状：** `database.types.ts` 显示异常

**解决方案：**
```bash
# 重新生成类型文件
npm run gen:types
```

### 5. SQL 执行失败

**症状：** `SQL execution error`

**可能原因：**
1. SQL 语法错误
2. 表或字段不存在
3. 权限不足

**解决方案：**
1. 先在 Dashboard SQL Editor 中测试 SQL
2. 检查 SQL 语法
3. 确认使用的是 `service_role_key`

---

## AI 编辑器操作指南

### AI 可以执行的操作

1. **生成类型定义**
   ```bash
   npm run gen:types
   ```

2. **执行 SQL 文件**
   ```bash
   node scripts/execute-sql.js sql/xxx.sql
   ```

### AI 操作流程

1. 根据需求编写 SQL 文件，保存到 `sql/` 目录
2. 执行 `node scripts/execute-sql.js sql/xxx.sql`
3. 如果修改了表结构，执行 `npm run gen:types` 更新类型

### 注意事项

- 执行 SQL 前建议备份重要数据
- `service_role_key` 有完全权限，不要提交到 Git
- 代理必须保持运行状态

---

## 相关链接

- Supabase Dashboard: https://supabase.com/dashboard
- 项目 API 设置: https://supabase.com/dashboard/project/olrgdjojldeuihkebmvc/settings/api
- Supabase 文档: https://supabase.com/docs
- Supabase CLI 文档: https://supabase.com/docs/reference/cli

---

## 更新记录

| 日期 | 内容 |
|------|------|
| 2026-03-06 | 创建文档，配置 Supabase CLI 和执行脚本 |
