-- 检查用户创建的计划数据
-- 1. 检查 workout_plans
SELECT id, name, rest_days, frequency_per_week, creator_id, source_template_id
FROM workout_plans 
WHERE source_template_id IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2. 检查 workout_days
SELECT wd.id, wd.plan_id, wd.name, wd.day_order, wd.rest_day, wp.name as plan_name
FROM workout_days wd
JOIN workout_plans wp ON wd.plan_id = wp.id
WHERE wp.source_template_id IS NULL
ORDER BY wp.created_at DESC, wd.day_order
LIMIT 20;

-- 3. 检查 plan_exercises
SELECT pe.id, pe.day_id, pe.exercise_id, pe.target_sets, pe.target_reps_min, pe.target_reps_max,
       wd.name as day_name, wd.day_order,
       e.name as exercise_name
FROM plan_exercises pe
JOIN workout_days wd ON pe.day_id = wd.id
JOIN workout_plans wp ON wd.plan_id = wp.id
LEFT JOIN exercises e ON pe.exercise_id = e.id
WHERE wp.source_template_id IS NULL
ORDER BY wp.created_at DESC, wd.day_order, pe.order_index
LIMIT 30;
