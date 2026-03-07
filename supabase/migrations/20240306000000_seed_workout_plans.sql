-- =====================================================
-- FitCore 训练计划完整填充脚本
-- 使用实际存在的动作名称
-- =====================================================

-- =====================================================
-- 第一步：完全清理现有数据
-- =====================================================

DELETE FROM plan_exercises WHERE day_id IN (
  SELECT id FROM workout_days WHERE plan_id IN (
    SELECT id FROM workout_plans WHERE is_system_template = true
  )
);

DELETE FROM workout_days WHERE plan_id IN (
  SELECT id FROM workout_plans WHERE is_system_template = true
);

-- 删除重复计划（保留最早创建的）
DELETE FROM workout_plans a
USING workout_plans b
WHERE a.is_system_template = true 
  AND b.is_system_template = true
  AND a.name = b.name
  AND a.created_at > b.created_at;

-- =====================================================
-- 第二步：填充所有训练计划
-- 动作名称映射：
--   杠铃深蹲 -> 深蹲
--   杠铃卧推 -> 杠铃平板卧推
--   哑铃卧推 -> 哑铃平板卧推
--   上斜哑铃卧推 -> 哑铃上斜卧推
--   哑铃侧平举 -> 侧平举
--   哑铃俯身飞鸟 -> 俯身飞鸟
--   单臂哑铃划船 -> 哑铃单臂划船
--   绳索夹胸 -> 龙门架夹胸
--   跑步 -> 跑步机跑步
--   小腿提踵 -> (暂无替代，跳过)
-- =====================================================

-- 模板1: 新手全身训练
DO $$
DECLARE
  plan_id uuid;
  day1_id uuid;
  day2_id uuid;
BEGIN
  SELECT id INTO plan_id FROM workout_plans WHERE name = '新手全身训练' AND is_system_template = true LIMIT 1;
  IF plan_id IS NOT NULL THEN
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '全身训练A', 1, ARRAY['chest', 'back', 'legs'], 'strength', false, 60)
    RETURNING id INTO day1_id;
    
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '全身训练B', 2, ARRAY['shoulders', 'arms', 'legs'], 'strength', false, 60)
    RETURNING id INTO day2_id;
    
    -- Day 1
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 1, 3, 8, 10, 120 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 2, 3, 8, 10, 90 FROM exercises WHERE name = '杠铃划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 3, 3, 8, 10, 120 FROM exercises WHERE name = '杠铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 4, 3, 10, 12, 60 FROM exercises WHERE name = '高位下拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 5, 3, 30, 45, 45 FROM exercises WHERE name = '平板支撑' LIMIT 1;
    
    -- Day 2
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 1, 3, 10, 12, 90 FROM exercises WHERE name = '腿举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 2, 3, 8, 10, 90 FROM exercises WHERE name = '杠铃推举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 3, 3, 10, 12, 60 FROM exercises WHERE name = '杠铃弯举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 4, 3, 12, 15, 45 FROM exercises WHERE name = '绳索下压' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 5, 3, 15, 20, 45 FROM exercises WHERE name = '卷腹' LIMIT 1;
  END IF;
END $$;

-- 模板2: 上下肢分化
DO $$
DECLARE
  plan_id uuid;
  day1_id uuid;
  day2_id uuid;
  day3_id uuid;
BEGIN
  SELECT id INTO plan_id FROM workout_plans WHERE name = '上下肢分化' AND is_system_template = true LIMIT 1;
  IF plan_id IS NOT NULL THEN
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '上肢训练', 1, ARRAY['chest', 'back', 'shoulders', 'arms'], 'strength', false, 75)
    RETURNING id INTO day1_id;
    
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '下肢训练', 2, ARRAY['quads', 'hamstrings', 'glutes', 'calves'], 'strength', false, 75)
    RETURNING id INTO day2_id;
    
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '全身训练', 3, ARRAY['full_body'], 'strength', false, 60)
    RETURNING id INTO day3_id;
    
    -- Day 1: 上肢
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 1, 4, 8, 10, 120 FROM exercises WHERE name = '杠铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 2, 4, 8, 10, 90 FROM exercises WHERE name = '杠铃划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 3, 3, 10, 12, 90 FROM exercises WHERE name = '杠铃推举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 4, 3, 10, 12, 60 FROM exercises WHERE name = '高位下拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 5, 3, 10, 12, 60 FROM exercises WHERE name = '杠铃弯举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 6, 3, 12, 15, 45 FROM exercises WHERE name = '绳索下压' LIMIT 1;
    
    -- Day 2: 下肢
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 1, 4, 6, 8, 180 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 2, 4, 8, 10, 120 FROM exercises WHERE name = '罗马尼亚硬拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 3, 3, 10, 12, 90 FROM exercises WHERE name = '腿举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 4, 3, 12, 15, 60 FROM exercises WHERE name = '腿弯举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 5, 3, 12, 15, 60 FROM exercises WHERE name = '腿屈伸' LIMIT 1;
    
    -- Day 3: 全身
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 1, 3, 10, 12, 90 FROM exercises WHERE name = '哑铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 2, 3, 10, 12, 60 FROM exercises WHERE name = '坐姿划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 3, 3, 10, 12, 60 FROM exercises WHERE name = '箭步蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 4, 3, 12, 15, 45 FROM exercises WHERE name = '侧平举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 5, 3, 30, 45, 45 FROM exercises WHERE name = '平板支撑' LIMIT 1;
  END IF;
END $$;

-- 模板3: 推拉腿 (PPL)
DO $$
DECLARE
  plan_id uuid;
  day1_id uuid;
  day2_id uuid;
  day3_id uuid;
  day4_id uuid;
  day5_id uuid;
  day6_id uuid;
BEGIN
  SELECT id INTO plan_id FROM workout_plans WHERE name = '推拉腿 (PPL)' AND is_system_template = true LIMIT 1;
  IF plan_id IS NOT NULL THEN
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '推日', 1, ARRAY['chest', 'shoulders', 'triceps'], 'strength', false, 75)
    RETURNING id INTO day1_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '拉日', 2, ARRAY['back', 'biceps'], 'strength', false, 75)
    RETURNING id INTO day2_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '腿日', 3, ARRAY['quads', 'hamstrings', 'glutes'], 'strength', false, 75)
    RETURNING id INTO day3_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '推日2', 4, ARRAY['chest', 'shoulders', 'triceps'], 'strength', false, 75)
    RETURNING id INTO day4_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '拉日2', 5, ARRAY['back', 'biceps'], 'strength', false, 75)
    RETURNING id INTO day5_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '腿日2', 6, ARRAY['quads', 'hamstrings', 'glutes'], 'strength', false, 75)
    RETURNING id INTO day6_id;
    
    -- Day 1: 推日
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 1, 4, 6, 8, 180 FROM exercises WHERE name = '杠铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 2, 3, 10, 12, 90 FROM exercises WHERE name = '哑铃上斜卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 3, 4, 8, 10, 90 FROM exercises WHERE name = '杠铃推举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 4, 4, 12, 15, 45 FROM exercises WHERE name = '侧平举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 5, 3, 10, 12, 60 FROM exercises WHERE name = '窄距卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 6, 3, 12, 15, 45 FROM exercises WHERE name = '绳索下压' LIMIT 1;
    
    -- Day 2: 拉日
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 1, 4, 6, 10, 120 FROM exercises WHERE name = '引体向上' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 2, 4, 8, 10, 90 FROM exercises WHERE name = '杠铃划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 3, 3, 10, 12, 60 FROM exercises WHERE name = '坐姿划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 4, 3, 15, 20, 45 FROM exercises WHERE name = '面拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 5, 4, 10, 12, 60 FROM exercises WHERE name = '杠铃弯举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 6, 3, 10, 12, 60 FROM exercises WHERE name = '锤式弯举' LIMIT 1;
    
    -- Day 3: 腿日
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 1, 4, 6, 8, 180 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 2, 4, 8, 10, 120 FROM exercises WHERE name = '罗马尼亚硬拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 3, 3, 10, 12, 90 FROM exercises WHERE name = '腿举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 4, 3, 12, 15, 60 FROM exercises WHERE name = '腿弯举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 5, 3, 12, 15, 60 FROM exercises WHERE name = '腿屈伸' LIMIT 1;
    
    -- Day 4: 推日2
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 1, 4, 8, 10, 120 FROM exercises WHERE name = '哑铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 2, 3, 12, 15, 60 FROM exercises WHERE name = '龙门架夹胸' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 3, 4, 12, 15, 45 FROM exercises WHERE name = '俯身飞鸟' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 4, 4, 12, 15, 45 FROM exercises WHERE name = '侧平举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 5, 4, 12, 15, 45 FROM exercises WHERE name = '绳索下压' LIMIT 1;
    
    -- Day 5: 拉日2
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 1, 4, 10, 12, 60 FROM exercises WHERE name = '高位下拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 2, 4, 10, 12, 60 FROM exercises WHERE name = '哑铃单臂划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 3, 3, 15, 20, 45 FROM exercises WHERE name = '面拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 4, 4, 10, 12, 60 FROM exercises WHERE name = '哑铃弯举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 5, 3, 10, 12, 60 FROM exercises WHERE name = '锤式弯举' LIMIT 1;
    
    -- Day 6: 腿日2
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day6_id, id, 1, 4, 8, 10, 180 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day6_id, id, 2, 3, 10, 12, 60 FROM exercises WHERE name = '箭步蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day6_id, id, 3, 3, 10, 12, 120 FROM exercises WHERE name = '罗马尼亚硬拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day6_id, id, 4, 3, 12, 15, 60 FROM exercises WHERE name = '腿弯举' LIMIT 1;
  END IF;
END $$;

-- 模板4: 5×5 力量训练
DO $$
DECLARE
  plan_id uuid;
  day1_id uuid;
  day2_id uuid;
  day3_id uuid;
BEGIN
  SELECT id INTO plan_id FROM workout_plans WHERE name = '5×5 力量训练' AND is_system_template = true LIMIT 1;
  IF plan_id IS NOT NULL THEN
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '训练A', 1, ARRAY['quads', 'chest', 'back'], 'strength', false, 60)
    RETURNING id INTO day1_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '训练B', 2, ARRAY['quads', 'back', 'shoulders'], 'strength', false, 60)
    RETURNING id INTO day2_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '训练A', 3, ARRAY['quads', 'chest', 'back'], 'strength', false, 60)
    RETURNING id INTO day3_id;
    
    -- Day 1: 训练A
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 1, 5, 5, 5, 300 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 2, 5, 5, 5, 300 FROM exercises WHERE name = '杠铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 3, 5, 5, 5, 300 FROM exercises WHERE name = '杠铃划船' LIMIT 1;
    
    -- Day 2: 训练B
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 1, 5, 5, 5, 300 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 2, 5, 5, 5, 300 FROM exercises WHERE name = '杠铃推举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 3, 5, 5, 5, 300 FROM exercises WHERE name = '罗马尼亚硬拉' LIMIT 1;
    
    -- Day 3: 训练A
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 1, 5, 5, 5, 300 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 2, 5, 5, 5, 300 FROM exercises WHERE name = '杠铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 3, 5, 5, 5, 300 FROM exercises WHERE name = '杠铃划船' LIMIT 1;
  END IF;
END $$;

-- 模板5: 5/3/1 力量计划
DO $$
DECLARE
  plan_id uuid;
  day1_id uuid;
  day2_id uuid;
  day3_id uuid;
  day4_id uuid;
BEGIN
  SELECT id INTO plan_id FROM workout_plans WHERE name = '5/3/1 力量计划' AND is_system_template = true LIMIT 1;
  IF plan_id IS NOT NULL THEN
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '深蹲日', 1, ARRAY['quads', 'glutes', 'core'], 'strength', false, 60)
    RETURNING id INTO day1_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '卧推日', 2, ARRAY['chest', 'triceps', 'shoulders'], 'strength', false, 60)
    RETURNING id INTO day2_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '硬拉日', 3, ARRAY['back', 'hamstrings', 'glutes'], 'strength', false, 60)
    RETURNING id INTO day3_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '推举日', 4, ARRAY['shoulders', 'triceps'], 'strength', false, 60)
    RETURNING id INTO day4_id;
    
    -- Day 1: 深蹲日
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 1, 5, 5, 5, 300 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 2, 5, 10, 15, 60 FROM exercises WHERE name = '腿举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 3, 3, 15, 20, 45 FROM exercises WHERE name = '卷腹' LIMIT 1;
    
    -- Day 2: 卧推日
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 1, 5, 5, 5, 300 FROM exercises WHERE name = '杠铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 2, 5, 10, 15, 60 FROM exercises WHERE name = '哑铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 3, 3, 12, 15, 45 FROM exercises WHERE name = '绳索下压' LIMIT 1;
    
    -- Day 3: 硬拉日
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 1, 5, 5, 5, 300 FROM exercises WHERE name = '罗马尼亚硬拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 2, 5, 10, 15, 60 FROM exercises WHERE name = '杠铃划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 3, 3, 12, 15, 45 FROM exercises WHERE name = '杠铃弯举' LIMIT 1;
    
    -- Day 4: 推举日
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 1, 5, 5, 5, 300 FROM exercises WHERE name = '杠铃推举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 2, 5, 10, 15, 60 FROM exercises WHERE name = '侧平举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 3, 3, 12, 15, 45 FROM exercises WHERE name = '窄距卧推' LIMIT 1;
  END IF;
END $$;

-- 模板6: 减脂HIIT
DO $$
DECLARE
  plan_id uuid;
  day1_id uuid;
  day2_id uuid;
  day3_id uuid;
  day4_id uuid;
  day5_id uuid;
BEGIN
  SELECT id INTO plan_id FROM workout_plans WHERE name = '减脂HIIT' AND is_system_template = true LIMIT 1;
  IF plan_id IS NOT NULL THEN
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '全身力量', 1, ARRAY['full_body'], 'strength', false, 45)
    RETURNING id INTO day1_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, 'HIIT训练', 2, ARRAY['cardio'], 'cardio', false, 30)
    RETURNING id INTO day2_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '上肢力量', 3, ARRAY['chest', 'back', 'arms'], 'strength', false, 45)
    RETURNING id INTO day3_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '有氧核心', 4, ARRAY['cardio', 'core'], 'cardio', false, 30)
    RETURNING id INTO day4_id;
    INSERT INTO workout_days (id, plan_id, name, day_order, focus_muscles, day_type, rest_day, estimated_duration_minutes)
    VALUES (gen_random_uuid(), plan_id, '下肢力量', 5, ARRAY['quads', 'hamstrings', 'glutes'], 'strength', false, 45)
    RETURNING id INTO day5_id;
    
    -- Day 1: 全身力量
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 1, 3, 15, 20, 45 FROM exercises WHERE name = '俯卧撑' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 2, 3, 12, 15, 45 FROM exercises WHERE name = '箭步蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 3, 3, 12, 15, 45 FROM exercises WHERE name = '坐姿划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 4, 3, 12, 15, 60 FROM exercises WHERE name = '哑铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day1_id, id, 5, 1, 15, 20, 0 FROM exercises WHERE name = '跑步机跑步' LIMIT 1;
    
    -- Day 2: HIIT训练
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 1, 1, 10, 15, 30 FROM exercises WHERE name = '跳绳' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 2, 3, 20, 30, 30 FROM exercises WHERE name = '俯卧撑' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 3, 3, 15, 20, 30 FROM exercises WHERE name = '箭步蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 4, 3, 20, 30, 30 FROM exercises WHERE name = '卷腹' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day2_id, id, 5, 1, 5, 10, 0 FROM exercises WHERE name = '跳绳' LIMIT 1;
    
    -- Day 3: 上肢力量
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 1, 3, 12, 15, 60 FROM exercises WHERE name = '哑铃平板卧推' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 2, 3, 12, 15, 60 FROM exercises WHERE name = '坐姿划船' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 3, 3, 15, 20, 45 FROM exercises WHERE name = '侧平举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 4, 3, 12, 15, 45 FROM exercises WHERE name = '杠铃弯举' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day3_id, id, 5, 3, 12, 15, 45 FROM exercises WHERE name = '绳索下压' LIMIT 1;
    
    -- Day 4: 有氧核心
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 1, 1, 20, 30, 0 FROM exercises WHERE name = '跑步机跑步' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 2, 3, 45, 60, 30 FROM exercises WHERE name = '平板支撑' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 3, 3, 20, 25, 30 FROM exercises WHERE name = '卷腹' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day4_id, id, 4, 3, 20, 30, 30 FROM exercises WHERE name = '俄罗斯转体' LIMIT 1;
    
    -- Day 5: 下肢力量
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 1, 3, 10, 12, 120 FROM exercises WHERE name = '深蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 2, 3, 12, 15, 60 FROM exercises WHERE name = '箭步蹲' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 3, 3, 10, 12, 90 FROM exercises WHERE name = '罗马尼亚硬拉' LIMIT 1;
    INSERT INTO plan_exercises (day_id, exercise_id, order_index, target_sets, target_reps_min, target_reps_max, rest_seconds) 
    SELECT day5_id, id, 4, 3, 15, 20, 45 FROM exercises WHERE name = '腿屈伸' LIMIT 1;
  END IF;
END $$;

-- =====================================================
-- 验证结果
-- =====================================================

SELECT 
  wp.name as plan_name,
  COUNT(DISTINCT wd.id) as days_count,
  COUNT(pe.id) as exercises_count
FROM workout_plans wp
LEFT JOIN workout_days wd ON wp.id = wd.plan_id
LEFT JOIN plan_exercises pe ON wd.id = pe.day_id
WHERE wp.is_system_template = true
GROUP BY wp.id, wp.name
ORDER BY wp.name;
