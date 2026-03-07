-- =====================================================
-- 优化休息日存储方案
-- 将休息日从 workout_days 表中移除，改为在 workout_plans 中存储
-- =====================================================

-- 1. 添加 rest_days 字段到 workout_plans 表
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS rest_days integer[] DEFAULT '{}';

-- 2. 迁移现有数据：将休息日信息提取到 rest_days 字段
UPDATE workout_plans wp
SET rest_days = ARRAY(
  SELECT wd.day_order 
  FROM workout_days wd 
  WHERE wd.plan_id = wp.id AND wd.rest_day = true
  ORDER BY wd.day_order
)
WHERE EXISTS (
  SELECT 1 FROM workout_days wd 
  WHERE wd.plan_id = wp.id AND wd.rest_day = true
);

-- 3. 删除 workout_days 中的休息日记录
DELETE FROM workout_days WHERE rest_day = true;

-- 4. 为新字段添加注释
COMMENT ON COLUMN workout_plans.rest_days IS '休息日的索引数组（1-7表示周一到周日），如 [6, 7] 表示周六周日为休息日';

-- 5. 验证迁移结果
SELECT 
  wp.name,
  wp.frequency_per_week,
  wp.rest_days,
  COUNT(wd.id) as workout_days_count
FROM workout_plans wp
LEFT JOIN workout_days wd ON wp.id = wd.plan_id
GROUP BY wp.id, wp.name, wp.frequency_per_week, wp.rest_days
ORDER BY wp.name;
