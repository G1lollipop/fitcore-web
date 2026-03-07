-- 详细检查系统模板数据
-- 1. 检查 workout_plans 的 rest_days 字段
SELECT id, name, rest_days, frequency_per_week 
FROM workout_plans 
WHERE is_system_template = true
ORDER BY name;

-- 2. 检查 workout_days 中是否还有休息日记录
SELECT wp.name as plan_name, wd.name as day_name, wd.day_order, wd.rest_day
FROM workout_days wd
JOIN workout_plans wp ON wd.plan_id = wp.id
WHERE wp.is_system_template = true AND wd.rest_day = true
ORDER BY wp.name, wd.day_order;

-- 3. 检查每个模板的训练日数量
SELECT wp.name, COUNT(wd.id) as days_count
FROM workout_plans wp
LEFT JOIN workout_days wd ON wp.id = wd.plan_id
WHERE wp.is_system_template = true
GROUP BY wp.id, wp.name
ORDER BY wp.name;
