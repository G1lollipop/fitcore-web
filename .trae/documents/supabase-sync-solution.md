# Supabase SQL 同步问题解决方案

## 问题分析

当前项目状态：
- 使用 `@supabase/supabase-js` 作为客户端 SDK
- 有多个 SQL 文件需要同步到远程数据库
- 没有配置 Supabase CLI 项目结构
- 缺少 `supabase/config.toml` 配置文件

## 解决方案

### 方案一：使用 Supabase CLI（推荐）

#### 步骤 1：安装 Supabase CLI

**Windows 安装方式（选择一种）：**

```powershell
# 方式 1: 使用 Scoop（推荐）
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 方式 2: 使用 Chocolatey
choco install supabase

# 方式 3: 使用 npm
npm install -g supabase

# 方式 4: 直接下载二进制文件
# 访问 https://github.com/supabase/cli/releases 下载最新版本
```

#### 步骤 2：初始化项目配置

```powershell
# 在项目根目录执行
supabase init

# 这会创建：
# - supabase/config.toml
# - supabase/migrations/ 目录
```

#### 步骤 3：链接远程项目

```powershell
# 登录 Supabase
supabase login

# 链接到你的远程项目（项目 ID 从 URL 中获取）
# 你的项目 URL: https://olrgdjojldeuihkebmvc.supabase.co
# 项目 ID: olrgdjojldeuihkebmvc
supabase link --project-ref olrgdjojldeuihkebmvc
```

#### 步骤 4：执行 SQL 同步

```powershell
# 方式 1: 使用 db push（直接推送 SQL）
supabase db push

# 方式 2: 使用 db execute（执行单个文件）
supabase db execute -f sql/seed_workout_plans.sql

# 方式 3: 使用 migration 方式
# 将 SQL 文件移动到 supabase/migrations/ 目录
# 然后执行
supabase db push
```

---

### 方案二：使用 Supabase Dashboard（最简单）

直接在 Supabase 控制台执行 SQL：

1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 进入 SQL Editor
4. 复制粘贴 SQL 文件内容
5. 点击 Run 执行

---

### 方案三：创建同步脚本（自动化）

在项目中创建一个同步脚本，使用 Supabase REST API：

```javascript
// scripts/sync-sql.js
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 需要添加此密钥

async function executeSql(sqlContent) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ sql: sqlContent })
  });
  
  return response.json();
}

// 读取并执行 SQL 文件
const sqlFile = process.argv[2];
const sqlContent = fs.readFileSync(path.join(__dirname, '..', sqlFile), 'utf8');

executeSql(sqlContent)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

---

## 常见失败原因及解决方案

### 1. 网络问题（中国大陆常见）

**症状：** 连接超时、下载失败

**解决方案：**
```powershell
# 设置代理
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"

# 或使用镜像
npm config set registry https://registry.npmmirror.com
```

### 2. 认证问题

**症状：** 401 Unauthorized

**解决方案：**
- 确保使用正确的 Access Token
- 在 Dashboard -> Account -> Access Tokens 创建新 token
- 运行 `supabase login` 重新登录

### 3. 权限问题

**症状：** 403 Forbidden

**解决方案：**
- 确保你的账户有项目访问权限
- 检查 SQL 是否有足够的权限执行（需要 service_role key）

### 4. SQL 语法错误

**症状：** 执行中断

**解决方案：**
- 分段执行 SQL
- 检查 PostgreSQL 版本兼容性
- 使用 `supabase db diff` 检查差异

---

## 推荐工作流程

### 日常开发流程：

1. **本地开发：**
   ```powershell
   supabase start  # 启动本地 Supabase
   supabase db reset  # 重置本地数据库
   ```

2. **创建迁移：**
   ```powershell
   supabase migration new your_migration_name
   ```

3. **同步到远程：**
   ```powershell
   supabase db push
   ```

### 快速同步现有 SQL：

```powershell
# 直接执行 SQL 文件
supabase db execute -f sql/seed_workout_plans.sql --linked
```

---

## 需要添加的环境变量

在 `.env.local` 中添加：

```env
# 现有变量
NEXT_PUBLIC_SUPABASE_URL=https://olrgdjojldeuihkebmvc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 需要添加的变量（从 Dashboard -> Settings -> API 获取）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_DB_PASSWORD=your_database_password
```

---

## 执行步骤总结

1. ✅ 安装 Supabase CLI（使用 Scoop 或 npm）
2. ✅ 运行 `supabase login` 登录账户
3. ✅ 运行 `supabase init` 初始化项目
4. ✅ 运行 `supabase link --project-ref olrgdjojldeuihkebmvc` 链接项目
5. ✅ 执行 `supabase db execute -f sql/seed_workout_plans.sql --linked` 同步 SQL

---

## 故障排除命令

```powershell
# 检查 CLI 版本
supabase --version

# 检查项目状态
supabase status

# 查看项目信息
supabase projects list

# 测试连接
supabase db pull --schema public --dry-run
```
