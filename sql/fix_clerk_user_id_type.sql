-- =====================================================
-- FitCore 修复 Clerk 用户ID类型问题
-- 问题：Clerk 的用户ID格式是 "user_xxx"，不是标准UUID
-- 解决：将所有 user_id 和 creator_id 字段从 UUID 改为 TEXT
-- 执行前请备份数据库！
-- =====================================================

-- =====================================================
-- 1. workout_plans 表 - creator_id 字段
-- =====================================================

-- 先删除外键约束（如果存在）
ALTER TABLE workout_plans 
DROP CONSTRAINT IF EXISTS workout_plans_creator_id_fkey;

-- 修改字段类型为 TEXT
ALTER TABLE workout_plans 
ALTER COLUMN creator_id TYPE TEXT USING creator_id::TEXT;

-- =====================================================
-- 2. user_settings 表 - user_id 字段
-- =====================================================

-- 先删除外键约束（如果存在）
ALTER TABLE user_settings 
DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;

-- 修改字段类型为 TEXT
ALTER TABLE user_settings 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- =====================================================
-- 3. daily_stats 表 - user_id 字段
-- =====================================================

ALTER TABLE daily_stats 
DROP CONSTRAINT IF EXISTS daily_stats_user_id_fkey;

ALTER TABLE daily_stats 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- =====================================================
-- 4. chat_messages 表 - user_id 字段
-- =====================================================

ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

ALTER TABLE chat_messages 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- =====================================================
-- 5. workout_sessions 表 - user_id 字段
-- =====================================================

ALTER TABLE workout_sessions 
DROP CONSTRAINT IF EXISTS workout_sessions_user_id_fkey;

ALTER TABLE workout_sessions 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- =====================================================
-- 6. personal_records 表 - user_id 字段
-- =====================================================

ALTER TABLE personal_records 
DROP CONSTRAINT IF EXISTS personal_records_user_id_fkey;

ALTER TABLE personal_records 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- =====================================================
-- 7. exercises 表 - created_by 字段
-- =====================================================

ALTER TABLE exercises 
DROP CONSTRAINT IF EXISTS exercises_created_by_fkey;

ALTER TABLE exercises 
ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- =====================================================
-- 验证改动
-- =====================================================

-- 检查 workout_plans 表
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workout_plans' AND column_name = 'creator_id';

-- 检查 user_settings 表
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_settings' AND column_name = 'user_id';

-- 检查其他相关表
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name IN ('user_id', 'creator_id', 'created_by')
AND table_schema = 'public'
ORDER BY table_name;
