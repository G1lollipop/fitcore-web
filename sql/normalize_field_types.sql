-- =====================================================
-- 字段类型规范化
-- =====================================================

-- 1. 将 user_settings.preferences 从 string 改为 jsonb
ALTER TABLE user_settings
ALTER COLUMN preferences TYPE jsonb
USING CASE 
    WHEN preferences IS NULL THEN NULL 
    WHEN preferences = '' THEN NULL 
    ELSE preferences::jsonb 
END;

-- 2. 时间字段统一使用 timestamptz 类型
-- workout_sessions 表
ALTER TABLE workout_sessions
ALTER COLUMN started_at TYPE timestamptz
USING started_at::timestamptz;

ALTER TABLE workout_sessions
ALTER COLUMN completed_at TYPE timestamptz
USING completed_at::timestamptz;

-- set_logs 表
ALTER TABLE set_logs
ALTER COLUMN completed_at TYPE timestamptz
USING completed_at::timestamptz;

-- workout_plans 表
ALTER TABLE workout_plans
ALTER COLUMN created_at TYPE timestamptz
USING created_at::timestamptz;

ALTER TABLE workout_plans
ALTER COLUMN updated_at TYPE timestamptz
USING updated_at::timestamptz;

-- workout_days 表
ALTER TABLE workout_days
ALTER COLUMN created_at TYPE timestamptz
USING created_at::timestamptz;

-- plan_exercises 表
ALTER TABLE plan_exercises
ALTER COLUMN created_at TYPE timestamptz
USING created_at::timestamptz;

-- daily_stats 表
ALTER TABLE daily_stats
ALTER COLUMN date TYPE date
USING date::date;

-- user_settings 表
ALTER TABLE user_settings
ALTER COLUMN current_plan_start_date TYPE date
USING current_plan_start_date::date;

ALTER TABLE user_settings
ALTER COLUMN created_at TYPE timestamptz
USING created_at::timestamptz;

-- chat_messages 表
ALTER TABLE chat_messages
ALTER COLUMN created_at TYPE timestamptz
USING created_at::timestamptz;

-- 验证字段类型
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN ('user_settings', 'workout_sessions', 'set_logs', 'workout_plans', 'workout_days', 'plan_exercises', 'daily_stats', 'chat_messages')
ORDER BY table_name, ordinal_position;
