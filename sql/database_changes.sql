-- =====================================================
-- FitCore 数据库改动脚本
-- 执行前请备份数据库！
-- =====================================================

-- =====================================================
-- 1. workout_plans 表改造
-- =====================================================

-- 添加 creator_id 字段（创建者）- 使用 TEXT 类型以兼容 Clerk 用户ID格式
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS creator_id TEXT;

-- 添加 is_public 字段（是否公开分享）
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 删除旧的 user_id 字段（如果存在）
ALTER TABLE workout_plans 
DROP COLUMN IF EXISTS user_id;

-- =====================================================
-- 2. user_settings 表新增字段（用户当前计划）
-- =====================================================

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS current_plan_id TEXT REFERENCES workout_plans(id);

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS current_plan_start_date DATE;

-- =====================================================
-- 3. set_logs 表增加 plan_exercise_id 关联
-- =====================================================

ALTER TABLE set_logs 
ADD COLUMN IF NOT EXISTS plan_exercise_id TEXT REFERENCES plan_exercises(id);

-- =====================================================
-- 4. 为现有系统模板设置标识
-- =====================================================

-- 将现有的非用户计划标记为系统模板
UPDATE workout_plans 
SET is_system_template = true, is_public = true 
WHERE is_system_template = false AND creator_id IS NULL;

-- =====================================================
-- 验证改动
-- =====================================================

-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'workout_plans' ORDER BY ordinal_position;

-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_settings' AND column_name IN ('current_plan_id', 'current_plan_start_date');
