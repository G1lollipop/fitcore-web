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
    headers: { 'x-my-custom-header': 'check-data-script' }
  },
  httpAgent: httpsAgent
});

async function checkData() {
  console.log('=== 检查系统模板数据 ===\n');

  // 1. 检查系统模板的 rest_days
  const { data: plans, error: plansError } = await supabase
    .from('workout_plans')
    .select('id, name, rest_days, frequency_per_week')
    .eq('is_system_template', true);

  if (plansError) {
    console.error('查询系统模板失败:', plansError);
    return;
  }

  console.log('系统模板列表:');
  plans.forEach(p => {
    console.log(`  - ${p.name}: rest_days=${JSON.stringify(p.rest_days)}, frequency=${p.frequency_per_week}`);
  });

  // 2. 检查每个模板的 workout_days
  console.log('\n=== 检查 workout_days ===\n');
  
  for (const plan of plans) {
    const { data: days, error: daysError } = await supabase
      .from('workout_days')
      .select('id, name, day_order, rest_day')
      .eq('plan_id', plan.id)
      .order('day_order');

    if (daysError) {
      console.error(`查询 ${plan.name} 的训练日失败:`, daysError);
      continue;
    }

    console.log(`${plan.name} (${days.length} 天):`);
    days.forEach(d => {
      console.log(`  - ${d.day_order}. ${d.name} (rest_day=${d.rest_day})`);
    });

    // 3. 检查每个训练日的动作
    for (const day of days) {
      if (!day.rest_day) {
        const { data: exercises, error: exError } = await supabase
          .from('plan_exercises')
          .select('id, target_sets, target_reps_min, target_reps_max, exercises(name)')
          .eq('day_id', day.id);

        if (exError) {
          console.error(`  查询 ${day.name} 的动作失败:`, exError);
          continue;
        }

        if (exercises && exercises.length > 0) {
          console.log(`    动作 (${exercises.length} 个):`);
          exercises.forEach((ex, i) => {
            const exName = ex.exercises?.name || '未知';
            console.log(`      ${i + 1}. ${exName}: ${ex.target_sets}组 ${ex.target_reps_min}-${ex.target_reps_max}次`);
          });
        } else {
          console.log(`    动作: 无`);
        }
      }
    }
    console.log('');
  }
}

checkData();
