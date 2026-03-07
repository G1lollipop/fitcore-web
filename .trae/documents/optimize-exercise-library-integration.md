# 优化动作库功能集成计划

## 背景

当前项目中，"动作库"作为侧边栏的一个独立菜单项存在，用户可以浏览所有动作。但这个设计不够高效，用户更需要在创建训练计划时直接选择动作，而不是单独浏览动作库。

## 当前架构分析

### 现有实现
- **侧边栏**: `components/sidebar-nav.tsx` - 包含"动作库"菜单项
- **动作库组件**: `components/exercise-library.tsx` - 独立的动作浏览页面
- **训练计划组件**: `components/workout-plans.tsx` - 目前只能从模板复制，无法自定义创建
- **Server Actions**: `app/actions/exercises.ts` - 提供动作相关的 API

### 存在的问题
1. 动作库作为独立页面，使用频率低
2. 训练计划创建功能不完整，只能从模板复制
3. 缺少动作选择器组件，无法在创建计划时选择动作

## 优化方案

### 核心思路
将"动作库"从侧边栏移除，改为在用户创建/编辑训练计划时，通过弹窗形式提供动作选择功能。

### 技术方案

#### 1. 创建动作选择器组件
**文件**: `components/exercise-selector.tsx`

**功能**:
- 搜索动作（支持中英文）
- 按肌肉群、器械、难度筛选
- 分页显示
- 支持多选
- 显示已选动作列表
- 确认/取消按钮

**复用代码**:
- 从 `exercise-library.tsx` 复用筛选逻辑
- 从 `app/actions/exercises.ts` 复用数据获取逻辑

#### 2. 增强训练计划组件
**文件**: `components/workout-plans.tsx`

**新增功能**:
- "创建自定义计划"按钮
- 计划创建/编辑弹窗
- 训练日管理（添加/删除/编辑训练日）
- 每个训练日的动作列表管理
- 集成动作选择器

**数据结构**:
```typescript
interface CustomPlan {
  name: string
  description: string
  goal: string
  frequency_per_week: number
  days: CustomPlanDay[]
}

interface CustomPlanDay {
  name: string
  focus_muscles: string[]
  exercises: SelectedExercise[]
}

interface SelectedExercise {
  exercise_id: string
  name: string
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  target_weight_kg?: number
}
```

#### 3. 新增 Server Actions
**文件**: `app/actions/plans.ts`

**新增函数**:
- `createCustomPlan(userId, planData)` - 创建自定义计划
- `updatePlanExercises(planId, days)` - 更新计划中的动作

#### 4. 移除侧边栏动作库菜单
**文件**: `components/sidebar-nav.tsx`

**修改**:
- 从 `navItems` 数组中移除 `exercise-library` 项
- 移除相关的导入

#### 5. 清理主页面的动作库渲染
**文件**: `app/page.tsx`

**修改**:
- 移除 `activeNav === "exercise-library"` 的条件渲染

## 实施步骤

### 第一阶段：创建动作选择器组件
1. 创建 `components/exercise-selector.tsx`
2. 实现搜索、筛选、分页功能
3. 实现多选和确认逻辑
4. 添加样式和交互效果

### 第二阶段：增强训练计划组件
1. 在 `workout-plans.tsx` 中添加"创建自定义计划"按钮
2. 创建计划编辑弹窗组件
3. 实现训练日管理功能
4. 集成动作选择器组件
5. 实现保存逻辑

### 第三阶段：后端支持
1. 在 `app/actions/plans.ts` 中添加 `createCustomPlan` 函数
2. 添加 `updatePlanExercises` 函数
3. 确保数据库操作正确

### 第四阶段：清理旧代码
1. 从 `sidebar-nav.tsx` 移除动作库菜单项
2. 从 `app/page.tsx` 移除动作库渲染逻辑
3. 保留 `exercise-library.tsx` 文件（可能用于其他场景）

## 文件变更清单

### 新增文件
- `components/exercise-selector.tsx` - 动作选择器组件
- `components/plan-editor-modal.tsx` - 计划编辑弹窗（可选，也可集成在 workout-plans.tsx 中）

### 修改文件
- `components/workout-plans.tsx` - 增强计划创建功能
- `components/sidebar-nav.tsx` - 移除动作库菜单项
- `app/page.tsx` - 移除动作库渲染
- `app/actions/plans.ts` - 添加自定义计划创建 API

### 保留文件
- `components/exercise-library.tsx` - 保留但不从侧边栏访问
- `app/actions/exercises.ts` - 继续提供动作数据 API

## 用户体验流程

### 创建自定义计划流程
1. 用户点击"训练计划"
2. 点击"创建自定义计划"按钮
3. 弹出计划编辑器
4. 填写计划基本信息（名称、描述、目标、每周训练天数）
5. 为每个训练日命名并选择重点肌群
6. 点击"添加动作"按钮，弹出动作选择器
7. 在动作选择器中搜索、筛选、选择动作
8. 为每个动作设置组数、次数、重量
9. 保存计划

## 注意事项

1. **数据一致性**: 确保新创建的计划与现有模板计划数据结构一致
2. **用户体验**: 动作选择器应支持快速搜索和批量选择
3. **响应式设计**: 弹窗在移动端也要有良好的体验
4. **错误处理**: 处理网络错误、数据验证失败等情况
5. **性能优化**: 动作列表分页加载，避免一次性加载过多数据

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 动作选择器组件复杂度高 | 开发时间长 | 复用现有代码，分步实现 |
| 用户习惯改变 | 用户困惑 | 提供引导提示 |
| 数据库操作复杂 | 可能出错 | 充分测试，添加事务处理 |

## 预期效果

1. 侧边栏更简洁，只保留核心功能
2. 用户创建训练计划更直观
3. 动作选择与计划创建流程无缝集成
4. 提高用户创建自定义计划的积极性
