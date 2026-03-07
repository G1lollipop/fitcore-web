-- 检查系统模板的 rest_days 字段和 workout_days 数据
SELECT 
  wp.id,
  wp.name,
  wp.rest_days,
  wp.frequency_per_week,
  COUNT(wd.id) as workout_days_count,
  COUNT(pe.id) as plan_exercises_count
FROM workout_plans wp
LEFT JOIN workout_days wd ON wp.id = wd.plan_id
LEFT JOIN plan_exercises pe ON wd.id = pe.day_id
WHERE wp.is_system_template = true
GROUP BY wp.id, wp.name, wp.rest_days, wp.frequency_per_week
ORDER BY wp.name;
