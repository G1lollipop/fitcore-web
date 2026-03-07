-- =====================================================
-- 数据库索引优化 - 高优先级
-- =====================================================

-- 1. daily_stats 表：用户+日期联合索引（高频查询）
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date
ON daily_stats(user_id, date DESC);

-- 2. workout_sessions 表：用户+创建时间索引
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_created
ON workout_sessions(user_id, created_at DESC);

-- 3. set_logs 表：会话+动作索引（查询特定训练日的记录）
CREATE INDEX IF NOT EXISTS idx_set_logs_session_exercise
ON set_logs(session_id, exercise_id);

-- 4. workout_plans 表：创建者+模板类型索引
CREATE INDEX IF NOT EXISTS idx_workout_plans_creator_template
ON workout_plans(creator_id, is_system_template);

-- 5. user_settings 表：确保 user_id 有索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
ON user_settings(user_id);

-- 6. workout_days 表：计划+训练日顺序索引
CREATE INDEX IF NOT EXISTS idx_workout_days_plan_order
ON workout_days(plan_id, day_order);

-- 7. plan_exercises 表：训练日+顺序索引
CREATE INDEX IF NOT EXISTS idx_plan_exercises_day_order
ON plan_exercises(day_id, order_index);

-- 8. chat_messages 表：用户+创建时间索引
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
ON chat_messages(user_id, created_at DESC);

-- 验证索引创建
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
