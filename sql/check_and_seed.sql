-- =====================================================
-- FitCore 训练计划清理和填充脚本
-- 1. 清理重复计划
-- 2. 只使用数据库中存在的动作
-- =====================================================

-- =====================================================
-- 第一步：清理重复数据
-- =====================================================

-- 删除所有系统模板的训练日和动作
DELETE FROM plan_exercises WHERE day_id IN (
  SELECT id FROM workout_days WHERE plan_id IN (
    SELECT id FROM workout_plans WHERE is_system_template = true
  )
);

DELETE FROM workout_days WHERE plan_id IN (
  SELECT id FROM workout_plans WHERE is_system_template = true
);

-- 删除重复的计划（保留最早创建的）
DELETE FROM workout_plans a
USING workout_plans b
WHERE a.is_system_template = true 
  AND b.is_system_template = true
  AND a.name = b.name
  AND a.created_at > b.created_at;

-- =====================================================
-- 第二步：查看可用的动作（执行后把结果发给我）
-- =====================================================

-- 取消下面的注释来查看动作列表
-- SELECT name FROM exercises ORDER BY name;

-- =====================================================
-- 第三步：填充训练计划（根据你的动作库调整）
-- 先执行上面的查询，然后我会帮你调整这部分
-- =====================================================

-- 临时查看哪些动作不存在
SELECT DISTINCT e.name as missing_exercise
FROM (
  VALUES 
    ('杠铃深蹲'), ('杠铃划船'), ('杠铃卧推'), ('高位下拉'), ('平板支撑'),
    ('腿举'), ('杠铃推举'), ('杠铃弯举'), ('绳索下压'), ('卷腹'),
    ('罗马尼亚硬拉'), ('腿弯举'), ('腿屈伸'), ('小腿提踵'),
    ('哑铃卧推'), ('坐姿划船'), ('箭步蹲'), ('哑铃侧平举'),
    ('引体向上'), ('面拉'), ('锤式弯举'), ('上斜哑铃卧推'),
    ('窄距卧推'), ('哑铃俯身飞鸟'), ('单臂哑铃划船'), ('哑铃弯举'),
    ('绳索夹胸'), ('俯卧撑'), ('跑步'), ('跳绳'), ('俄罗斯转体'),
    ('悬垂举腿')
) AS needed(name)
LEFT JOIN exercises e ON e.name = needed.name
WHERE e.name IS NULL;
