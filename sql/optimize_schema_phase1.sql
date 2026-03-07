-- =====================================================
-- 数据库优化方案 A - 第一阶段
-- 字段精简和索引优化
-- =====================================================

-- =====================================================
-- 1. 添加缺失的索引（提高查询性能）
-- =====================================================

-- workout_plans 表索引
CREATE INDEX IF NOT EXISTS idx_workout_plans_creator_id ON workout_plans(creator_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_is_system_template ON workout_plans(is_system_template);
CREATE INDEX IF NOT EXISTS idx_workout_plans_source_template_id ON workout_plans(source_template_id);

-- workout_days 表索引
CREATE INDEX IF NOT EXISTS idx_workout_days_plan_id ON workout_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_day_order ON workout_days(day_order);

-- plan_exercises 表索引
CREATE INDEX IF NOT EXISTS idx_plan_exercises_day_id ON plan_exercises(day_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_exercise_id ON plan_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_order_index ON plan_exercises(order_index);

-- workout_sessions 表索引
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan_id ON workout_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started ON workout_sessions(user_id, started_at DESC);

-- set_logs 表索引
CREATE INDEX IF NOT EXISTS idx_set_logs_session_id ON set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise_id ON set_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_plan_exercise_id ON set_logs(plan_exercise_id);

-- exercises 表索引
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);

-- =====================================================
-- 2. 删除 workout_days.rest_day 字段
-- =====================================================
-- 原因：休息日不插入 workout_days 表，此字段恒为 false，完全冗余
-- 判断休息日应使用 workout_plans.rest_days 数组

-- 先检查是否有数据使用此字段
DO $$
DECLARE
  rest_day_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rest_day_count FROM workout_days WHERE rest_day = true;
  
  IF rest_day_count > 0 THEN
    RAISE NOTICE '警告：有 % 条记录的 rest_day = true，这些数据可能需要清理', rest_day_count;
  ELSE
    RAISE NOTICE '检查通过：所有记录的 rest_day 都为 false，可以安全删除';
  END IF;
END $$;

-- 删除字段（注释掉，确认无误后再执行）
-- ALTER TABLE workout_days DROP COLUMN IF EXISTS rest_day;

-- =====================================================
-- 3. 合并计划类型字段（可选，建议分步实施）
-- =====================================================
-- 当前：is_template + is_system_template + is_ai_generated
-- 优化：合并为 plan_type 枚举字段

-- 步骤 1：添加新字段
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'custom';

-- 步骤 2：迁移数据
UPDATE workout_plans 
SET plan_type = CASE
  WHEN is_system_template = true THEN 'system_template'
  WHEN is_ai_generated = true THEN 'ai_generated'
  WHEN is_template = true THEN 'template'
  ELSE 'custom'
END
WHERE id IS NOT NULL;

-- 步骤 3：添加约束
ALTER TABLE workout_plans 
ADD CONSTRAINT chk_plan_type CHECK (plan_type IN ('custom', 'template', 'system_template', 'ai_generated', 'community'));

-- 步骤 4：删除旧字段（注释掉，确认数据迁移成功后再执行）
-- ALTER TABLE workout_plans DROP COLUMN IF EXISTS is_template;
-- ALTER TABLE workout_plans DROP COLUMN IF EXISTS is_system_template;
-- ALTER TABLE workout_plans DROP COLUMN IF EXISTS is_ai_generated;

-- =====================================================
-- 4. 验证结果
-- =====================================================

-- 查看新增索引
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 查看 workout_plans 的 plan_type 分布
SELECT 
  plan_type,
  COUNT(*) as count
FROM workout_plans
GROUP BY plan_type;
