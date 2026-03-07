-- 检查 seed_workout_plans.sql 中使用的所有动作是否存在于 exercises 表

WITH required_exercises AS (
  SELECT unnest(ARRAY[
    '杠铃深蹲', '杠铃划船', '杠铃卧推', '高位下拉', '平板支撑',
    '腿举', '杠铃推举', '杠铃弯举', '绳索下压', '卷腹',
    '罗马尼亚硬拉', '腿弯举', '腿屈伸', '小腿提踵',
    '哑铃卧推', '坐姿划船', '箭步蹲', '哑铃侧平举',
    '上斜哑铃卧推', '窄距卧推', '引体向上', '面拉', '锤式弯举',
    '绳索夹胸', '哑铃俯身飞鸟', '单臂哑铃划船', '哑铃弯举',
    '俯卧撑', '跳绳', '跑步', '俄罗斯转体'
  ]) AS name
)
SELECT 
  re.name AS missing_exercise
FROM required_exercises re
LEFT JOIN exercises e ON e.name = re.name
WHERE e.id IS NULL
ORDER BY re.name;
