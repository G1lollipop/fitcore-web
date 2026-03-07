# 训练计划与锻炼日志同步优化计划

## 问题分析

### 问题1：训练计划页面加载慢

**根本原因**：
1. **串行数据库查询**：`getCurrentPlan` 函数先查 `user_settings` 获取 `current_plan_id`，再查 `workout_plans` 获取计划详情（两次串行请求）
2. **嵌套数据查询**：获取计划时需要查询 `workout_days` → `plan_exercises` → `exercises`，层级深
3. **重复查询**：`handleViewPlan` 每次点击都重新查询 `getPlanById`，即使数据已存在

**相关代码**：
- [plans.ts:66-115](../app/actions/plans.ts#L66-L115) - `getCurrentPlan` 串行查询
- [workout-plans.tsx:56-81](../components/workout-plans.tsx#L56-L81) - 页面加载逻辑

### 问题2：锻炼日志与训练计划不同步

**根本原因**：
1. **硬编码的计划数据**：`MY_PLAN` 是静态数组，未从数据库获取
   ```typescript
   // daily-log-form.tsx:225
   const MY_PLAN = ["硬拉 4x5 100kg", "坐姿划船 3x12", "面拉 4x15"]
   ```
2. **数据存储分离**：
   - 训练计划：`workout_plans` 表
   - 锻炼日志：`daily_stats.workout_logs` JSON 字段
   - **两者没有外键关联**
3. **类型定义缺失关联字段**：`WorkoutLogItem` 不包含 `plan_id` 或 `day_id`
4. **数据库表未使用**：`workout_sessions` 和 `set_logs` 表已定义但未使用

---

## 实施计划

### 阶段1：优化训练计划页面加载速度

#### 任务1.1：优化 `getCurrentPlan` 查询
- **文件**：`app/actions/plans.ts`
- **改动**：合并两次查询为一次，使用 Supabase 的关联查询
- **预期效果**：减少一次数据库请求

#### 任务1.2：添加数据缓存
- **文件**：`components/workout-plans.tsx`
- **改动**：在组件状态中缓存已获取的计划详情，避免重复查询
- **预期效果**：点击"查看详情"时无需重新请求

#### 任务1.3：优化模板数据获取
- **文件**：`app/actions/plans.ts`
- **改动**：`getSystemTemplates` 只获取基本信息，展开时再获取详情
- **预期效果**：减少初始加载的数据量

---

### 阶段2：实现日志与计划同步

#### 任务2.1：修改 `WorkoutLogItem` 类型
- **文件**：`app/actions/types.ts`
- **改动**：添加 `plan_id` 和 `day_id` 字段
```typescript
export type WorkoutLogItem = {
  workout_name: string;
  sets: number | null;
  duration_minutes: number;
  calories_burned: number;
  logged_at: string;
  plan_id?: string | null;      // 新增：关联的训练计划
  day_id?: string | null;       // 新增：关联的训练日
};
```

#### 任务2.2：创建获取当前计划今日训练的 API
- **文件**：`app/actions/plans.ts`
- **改动**：新增 `getTodayWorkout` 函数，根据当前计划和日期返回今日训练内容
- **逻辑**：
  1. 获取用户的 `current_plan_id` 和 `current_plan_start_date`
  2. 计算今天是计划的第几天
  3. 返回对应的 `workout_day` 和 `plan_exercises`

#### 任务2.3：修改 `DailyLogForm` 组件
- **文件**：`components/daily-log-form.tsx`
- **改动**：
  1. 删除硬编码的 `MY_PLAN`
  2. 添加 `useEffect` 调用 `getTodayWorkout` 获取真实计划
  3. "导入我的计划表"按钮使用真实数据

#### 任务2.4：修改 `logWorkout` 函数
- **文件**：`app/actions/logWorkout.ts`
- **改动**：支持传入 `plan_id` 和 `day_id`，存储到日志中

---

### 阶段3：数据库优化（可选，需执行SQL）

#### 任务3.1：更新 `daily_stats.workout_logs` JSON 结构
- 确保新的日志格式包含 `plan_id` 和 `day_id`

#### 任务3.2：考虑使用 `workout_sessions` 表
- 长期方案：将锻炼日志迁移到专用的 `workout_sessions` 和 `set_logs` 表
- 好处：更好的数据关联和查询能力

---

## 文件改动清单

| 文件 | 改动类型 | 优先级 |
|------|----------|--------|
| `app/actions/plans.ts` | 修改 + 新增函数 | 高 |
| `components/workout-plans.tsx` | 修改 | 高 |
| `components/daily-log-form.tsx` | 修改 | 高 |
| `app/actions/types.ts` | 修改 | 中 |
| `app/actions/logWorkout.ts` | 修改 | 中 |

---

## 预期效果

1. **页面加载速度**：减少 1-2 次数据库请求，加载时间缩短 50%+
2. **日志与计划同步**：点击"导入我的计划表"会显示真实的当前计划训练内容
3. **数据关联**：日志可追溯到具体的训练计划和训练日
