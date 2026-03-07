# 问题分析与修复计划

## 发生了什么？

### 1. Supabase CLI 消失的原因

**时间线：**
1. ✅ 第一次成功安装：我们手动运行 `node scripts/postinstall.js` 并设置了代理，CLI 下载成功
2. ❌ 第二次失败：运行 `npm install supabase --save-dev` 时，npm 自动执行 postinstall 脚本
3. ❌ npm 的 postinstall 脚本**没有继承我们设置的代理环境变量**
4. ❌ 导致下载超时失败，npm 回滚安装，删除了 `node_modules/supabase` 目录

**根本原因：** npm 在 Windows 上运行 postinstall 时，环境变量传递有问题

### 2. database.types.ts "乱码"问题

**实际检查结果：** 文件内容是**正常的**，没有乱码！

你在 IDE 中看到的"乱码"可能是：
- PowerShell 的 `>` 重定向默认使用 UTF-16 编码
- 某些编辑器对 UTF-16 显示有问题
- 但实际文件内容是正确的 TypeScript 代码

---

## 修复方案

### 方案 A：创建独立的 CLI 安装脚本（推荐）

创建一个专门的脚本来安装 Supabase CLI，避免 npm postinstall 的代理问题：

```powershell
# scripts/install-supabase-cli.ps1
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:npm_config_https_proxy = "http://127.0.0.1:7890"

# 创建临时目录
$tempDir = "node_modules\supabase-temp"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# 下载 supabase 包
npm pack supabase --pack-destination $tempDir

# 解压并运行 postinstall
# ... 详细步骤
```

### 方案 B：使用 npx 直接运行（更简单）

每次使用时通过 npx 运行，但需要设置代理：

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
npx supabase gen types --linked --lang=typescript
```

### 方案 C：全局安装 CLI（需要管理员权限）

使用 Scoop 或手动下载二进制文件进行全局安装。

---

## 推荐的最终方案

### 1. 修复 database.types.ts 编码问题

使用 `Out-File -Encoding utf8` 代替 `>` 重定向：

```powershell
# 正确的方式
.\node_modules\supabase\bin\supabase.exe gen types --linked --lang=typescript | Out-File -Encoding utf8 lib/database.types.ts
```

### 2. 创建可靠的脚本

创建两个脚本：
- `scripts/install-supabase-cli.ps1` - 安装 CLI
- `scripts/gen-types.ps1` - 生成类型（已存在，需要修复编码）

### 3. 添加 npm 脚本

```json
{
  "scripts": {
    "gen:types": "powershell -ExecutionPolicy Bypass -File scripts/gen-types.ps1",
    "postinstall": "powershell -ExecutionPolicy Bypass -File scripts/install-supabase-cli.ps1"
  }
}
```

---

## 执行步骤

1. **修复 database.types.ts 编码** - 使用 UTF-8 编码重新生成
2. **重新安装 Supabase CLI** - 使用正确的方式设置代理
3. **更新脚本** - 确保编码正确
4. **验证** - 确认一切正常工作

---

## 关于 AI 编辑器操作云端数据库

**是的，AI 编辑器可以在本地操作云端 Supabase！**

但需要区分两种操作：

### 类型 1：生成类型定义（只读）
```bash
supabase gen types --linked --lang=typescript
```
✅ 这个已经可以工作了

### 类型 2：执行 SQL（写入）
需要使用 `supabase db execute` 命令，但当前 CLI 有问题。

**替代方案：** 创建一个 Node.js 脚本，使用 Supabase REST API 直接执行 SQL：

```javascript
// scripts/execute-sql.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // 需要 service_role key
);

async function executeSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  // 使用 RPC 或直接执行
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) console.error(error);
}

executeSqlFile(process.argv[2]);
```

这样 AI 编辑器就可以：
1. 生成 SQL 文件
2. 直接运行 `node scripts/execute-sql.js sql/xxx.sql`
3. 无需手动复制到云端
