require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('错误: NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 必须在 .env.local 中设置');
  console.error('获取 service role key: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('使用代理:', proxyUrl);

const httpsAgent = new HttpsProxyAgent(proxyUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: { 'x-my-custom-header': 'execute-sql-script' }
  },
  httpAgent: httpsAgent
});

async function executeSql(sqlContent) {
  const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

  if (error) {
    console.error('SQL 执行错误:', error);
    return false;
  }

  console.log('执行 SQL 成功！');
  if (data) console.log('结果:', data);
  return true;
}

async function main() {
  const sqlFile = process.argv[2];

  if (!sqlFile) {
    console.error('用法: node scripts/execute-sql.js <sql文件>');
    console.error('示例: node scripts/execute-sql.js sql/test.sql');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), sqlFile);
  console.log(`正在执行 SQL 文件: ${filePath}`);

  try {
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    await executeSql(sqlContent);
  } catch (err) {
    console.error('读取文件错误:', err);
    process.exit(1);
  }
}

main();
