import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  console.error('Get your service role key from: https://supabase.com/dashboard/project/_/settings/api')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sqlContent: string) {
  const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
  
  if (error) {
    console.error('SQL execution error:', error)
    return false
  }
  
  console.log('SQL executed successfully!')
  if (data) console.log('Result:', data)
  return true
}

async function main() {
  const sqlFile = process.argv[2]
  
  if (!sqlFile) {
    console.error('Usage: npx tsx scripts/execute-sql.ts <sql-file>')
    console.error('Example: npx tsx scripts/execute-sql.ts sql/seed_workout_plans.sql')
    process.exit(1)
  }

  const filePath = resolve(process.cwd(), sqlFile)
  console.log(`Executing SQL from: ${filePath}`)
  
  try {
    const sqlContent = readFileSync(filePath, 'utf-8')
    await executeSql(sqlContent)
  } catch (err) {
    console.error('Error reading file:', err)
    process.exit(1)
  }
}

main()
