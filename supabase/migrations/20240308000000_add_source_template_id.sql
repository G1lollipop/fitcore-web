-- 添加 source_template_id 字段用于区分用户订阅的计划和自己创建的计划
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES workout_plans(id);

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_workout_plans_source_template_id 
ON workout_plans(source_template_id);

-- 添加注释
COMMENT ON COLUMN workout_plans.source_template_id IS '来源模板ID，如果是从系统模板订阅的则有值，用户自己创建的为NULL';
