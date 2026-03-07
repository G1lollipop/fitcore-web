# 训练计划模块加载性能优化计划

## 问题诊断

### 一、数据库查询分析

#### 1. 页面加载时的查询情况

`WorkoutPlans` 组件加载时执行以下查询：

```typescript
const [userPlansRes, currentPlanRes, templatesRes] = await Promise.all([
  getUserPlans(userId),        // 查询1
  getCurrentPlan(userId),      // 查询2+3 (串行)
  getSystemTemplates(),        // 查询4
]);
```

**总计**: 4+ 次数据库查询

#### 2. 主要性能问题

| 问题类型 | 位置 | 影响 |
|---------|------|------|
| **串行查询** | `getCurrentPlan` | 先查 user_settings 获取 plan_id，再查 workout_plans |
| **串行查询** | `getTodayWorkout` | 同上，2次串行查询 |
| **N+1 查询** | `copyTemplateToUser` | 循环插入训练日，5+N 次查询 |
| **N+1 查询** | `createCustomPlan` | 循环插入训练日，1+N*2 次查询 |
| **深层嵌套** | `getSystemTemplates` | 4层嵌套查询，返回大量数据 |
| **重复查询** | `loadData` | 每次操作后重新加载全部数据 |

---

## 二、详细问题分析

### 问题1: `getCurrentPlan` 串行查询

**文件**: [plans.ts:46-75](d:\Projects\Vibe-coding\fitcore\app\actions\plans.ts#L46-L75)

```typescript
// 第一次查询
const { data: settings } = await supabase
  .from('user_settings')
  .select('current_plan_id, current_plan_start_date')
  .eq('user_id', userId)
  .single();

if (!settings?.current_plan_id) return null;

// 第二次查询 (依赖第一次结果)
const { data: plan } = await supabase
  .from('workout_plans')
  .select(`*, workout_days (...)`)
  .eq('id', settings.current_plan_id)
  .single();
```

**延迟**: 2次网络往返

### 问题2: `copyTemplateToUser` N+1 查询

**文件**: [plans.ts:301-411](d:\Projects\Vibe-coding\fitcore\app\actions\plans.ts#L301-L411)

```typescript
// 循环插入训练日 (N+1 问题)
for (const day of templateDays) {
  const { data: newDay } = await supabase
    .from('workout_days')
    .insert({...})
    .single();
  // ...
}
```

**影响**: 7个训练日 = 12次数据库查询

### 问题3: 数据重复获取

**文件**: [workout-plans.tsx:76-107](d:\Projects\Vibe-coding\fitcore\components\workout-plans.tsx#L76-L107)

每次操作后都调用 `loadData()` 重新获取所有数据，没有利用已有缓存。

---

## 三、优化方案

### 方案1: 合并串行查询为关联查询

**优化 `getCurrentPlan`**:

```typescript
export async function getCurrentPlan(userId: string) {
  const supabase = createClient();
  
  // 使用 Supabase 关联查询，一次获取
  const { data, error } = await supabase
    .from('user_settings')
    .select(`
      current_plan_id,
      current_plan_start_date,
      workout_plans!current_plan_id (
        *,
        workout_days (
          *,
          plan_exercises (
            *,
            exercises (*)
          )
        )
      )
    `)
    .eq('user_id', userId)
    .single();
    
  if (error || !data?.workout_plans) return null;
  
  return {
    ...data.workout_plans,
    start_date: data.current_plan_start_date
  };
}
```

**收益**: 减少1次网络往返

### 方案2: 批量插入解决 N+1 问题

**优化 `copyTemplateToUser`**:

```typescript
export async function copyTemplateToUser(templateId: string, userId: string) {
  const supabase = createClient();
  
  // 查询1: 获取模板
  const { data: template } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', templateId)
    .single();

  // 查询2: 创建新计划
  const { data: newPlan } = await supabase
    .from('workout_plans')
    .insert({...})
    .single();

  // 查询3: 获取模板的训练日和动作
  const { data: templateDays } = await supabase
    .from('workout_days')
    .select(`*, plan_exercises (*)`)
    .eq('plan_id', templateId);

  // 查询4: 批量插入训练日
  const daysToInsert = templateDays.map(day => ({
    plan_id: newPlan.id,
    name: day.name,
    day_order: day.day_order,
    day_type: day.day_type,
    rest_day: day.rest_day,
    focus_muscles: day.focus_muscles
  }));
  
  const { data: insertedDays } = await supabase
    .from('workout_days')
    .insert(daysToInsert)
    .select();

  // 查询5: 批量插入所有动作
  const allExercises = [];
  insertedDays.forEach((newDay, i) => {
    templateDays[i].plan_exercises.forEach(pe => {
      allExercises.push({
        day_id: newDay.id,
        exercise_id: pe.exercise_id,
        target_sets: pe.target_sets,
        target_reps_min: pe.target_reps_min,
        target_reps_max: pe.target_reps_max,
        target_weight_kg: pe.target_weight_kg
      });
    });
  });
  
  if (allExercises.length > 0) {
    await supabase.from('plan_exercises').insert(allExercises);
  }

  return { success: true, plan: newPlan };
}
```

**收益**: 查询次数从 5+N 减少到 5

### 方案3: 同样优化 `createCustomPlan`

将循环插入改为批量插入，查询次数从 1+N*2 减少到 3。

### 方案4: 优化 `getTodayWorkout`

同样使用关联查询合并串行查询。

### 方案5: 添加前端缓存策略

1. **使用 React Query 或 SWR** 进行数据缓存
2. **乐观更新**: 操作后直接更新本地状态，不重新加载
3. **增量更新**: 只更新变化的数据

---

## 四、实施步骤

### 第一阶段: 优化数据库查询 (高优先级)

| 步骤 | 任务 | 文件 | 预期收益 |
|------|------|------|----------|
| 1 | 优化 `getCurrentPlan` 为关联查询 | plans.ts | 减少1次查询 |
| 2 | 优化 `getTodayWorkout` 为关联查询 | plans.ts | 减少1次查询 |
| 3 | 优化 `copyTemplateToUser` 批量插入 | plans.ts | 减少 N 次查询 |
| 4 | 优化 `createCustomPlan` 批量插入 | plans.ts | 减少 N*2 次查询 |

### 第二阶段: 优化前端数据加载 (中优先级)

| 步骤 | 任务 | 文件 | 预期收益 |
|------|------|------|----------|
| 5 | 减少不必要的 `loadData` 调用 | workout-plans.tsx | 减少重复请求 |
| 6 | 利用 `plansCache` 避免重复查询 | workout-plans.tsx | 减少重复请求 |

### 第三阶段: 添加缓存层 (可选)

| 步骤 | 任务 | 描述 |
|------|------|------|
| 7 | 集成 React Query | 统一数据缓存和失效策略 |
| 8 | 实现乐观更新 | 操作后直接更新 UI |

---

## 五、预期效果

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 页面加载 | 4+ 次查询 | 3 次查询 |
| 复制模板(7天) | 12 次查询 | 5 次查询 |
| 创建计划(5天) | 11 次查询 | 3 次查询 |
| 获取今日训练 | 2 次查询 | 1 次查询 |

**总体预期**: 页面加载时间减少 40-60%
