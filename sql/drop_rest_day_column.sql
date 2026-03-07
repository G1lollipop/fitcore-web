-- =====================================================
-- 删除 workout_days.rest_day 字段
-- =====================================================

-- 注意：此操作不可逆，请确保已备份数据

-- 1. 先检查当前数据情况
SELECT 
  COUNT(*) as total_days,
  COUNT(CASE WHEN rest_day = true THEN 1 END) as rest_day_true,
  COUNT(CASE WHEN rest_day = false THEN 1 END) as rest_day_false
FROM workout_days;

-- 2. 删除字段（如果确认所有 rest_day 都为 false）
-- ALTER TABLE workout_days DROP COLUMN IF EXISTS rest_day;

-- 3. 验证删除结果
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'workout_days' ORDER BY ordinal_position;
