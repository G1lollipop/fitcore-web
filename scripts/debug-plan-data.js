require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { HttpsProxyAgent } = require('https-proxy-agent');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890';

const httpsAgent = new HttpsProxyAgent(proxyUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: { 'x-my-custom-header': 'debug-script' }
  },
  httpAgent: httpsAgent
});

async function debugPlanData() {
  console.log('=== 调试计划数据结构 ===\n');

  // 模拟 getSystemTemplates 查询
  const { data: templates, error: templatesError } = await supabase
    .from('workout_plans')
    .select(`
      *,
      workout_days (
        *,
        plan_exercises (
          *,
          exercises (*)
        )
      )
    `)
    .eq('is_system_template', true)
    .limit(1);

  if (templatesError) {
    console.error('查询失败:', templatesError);
    return;
  }

  console.log('查询结果示例:');
  console.log(JSON.stringify(templates, null, 2));

  // 检查第一个模板的数据结构
  if (templates && templates.length > 0) {
    const plan = templates[0];
    console.log('\n=== 数据结构分析 ===');
    console.log('计划名称:', plan.name);
    console.log('rest_days:', plan.rest_days);
    console.log('workout_days 数量:', plan.workout_days?.length);
    
    if (plan.workout_days && plan.workout_days.length > 0) {
      const firstDay = plan.workout_days[0];
      console.log('\n第一个训练日:');
      console.log('  名称:', firstDay.name);
      console.log('  rest_day:', firstDay.rest_day);
      console.log('  plan_exercises 类型:', typeof firstDay.plan_exercises);
      console.log('  plan_exercises 是否为数组:', Array.isArray(firstDay.plan_exercises));
      console.log('  plan_exercises 数量:', firstDay.plan_exercises?.length);
      
      if (firstDay.plan_exercises && firstDay.plan_exercises.length > 0) {
        console.log('\n  第一个动作:');
        const firstEx = firstDay.plan_exercises[0];
        console.log('    exercise_id:', firstEx.exercise_id);
        console.log('    target_sets:', firstEx.target_sets);
        console.log('    exercises:', firstEx.exercises);
      }
    }
  }
}

debugPlanData();
