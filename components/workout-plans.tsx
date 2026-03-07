'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  Dumbbell, Copy, ChevronRight, ChevronDown, Clock, Calendar, 
  Plus, Play, Pause, Trash2, Edit, X, Check, Flame, Save
} from 'lucide-react';
import { 
  getUserPlansLight, getCurrentPlanLight, getSystemTemplatesLight, copyTemplateToUser, 
  setCurrentPlan, deletePlan, getPlanById, createCustomPlan
} from '@/app/actions/plans';
import { ExerciseSelector, SelectedExercise } from './exercise-selector';
import type { Database } from '@/lib/database.types';

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
type WorkoutDay = Database['public']['Tables']['workout_days']['Row'];
type PlanExercise = Database['public']['Tables']['plan_exercises']['Row'];
type Exercise = Database['public']['Tables']['exercises']['Row'];

const goalLabels: Record<string, string> = {
  'general': '综合训练',
  'strength': '力量增长',
  'muscle_gain': '肌肉增长',
  'fat_loss': '减脂',
  'endurance': '耐力提升',
  'flexibility': '柔韧性',
};

const levelLabels: Record<string, string> = {
  'beginner': '初级',
  'intermediate': '中级',
  'advanced': '高级',
};

interface PlanWithDays extends WorkoutPlan {
  workout_days?: (WorkoutDay & { plan_exercises?: (PlanExercise & { exercises?: Exercise })[] })[];
}

interface CustomPlanDayData {
  name: string;
  focus_muscles: string[];
  rest_day: boolean;
  exercises: SelectedExercise[];
}

export function WorkoutPlans() {
  const { userId } = useAuth();
  const [userPlans, setUserPlans] = useState<PlanWithDays[]>([]);
  const [currentPlan, setCurrentPlanData] = useState<PlanWithDays | null>(null);
  const [templates, setTemplates] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PlanWithDays | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [plansCache, setPlansCache] = useState<Map<string, PlanWithDays>>(new Map());
  const [showCustomPlanModal, setShowCustomPlanModal] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [customPlanData, setCustomPlanData] = useState({
    name: '',
    description: '',
    goal: 'general',
    experience_level: 'beginner',
    duration_weeks: 8,
  });
  const [customDays, setCustomDays] = useState<CustomPlanDayData[]>([]);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const [userPlansRes, currentPlanRes, templatesRes] = await Promise.all([
        getUserPlansLight(userId),
        getCurrentPlanLight(userId),
        getSystemTemplatesLight(),
      ]);

      if (userPlansRes.success && userPlansRes.data) {
        const plans = userPlansRes.data as PlanWithDays[];
        setUserPlans(plans);
        const newCache = new Map(plansCache);
        plans.forEach(plan => {
          // 检查新数据是否包含完整的 workout_days
          const hasWorkoutDays = plan.workout_days && plan.workout_days.length > 0;
          const hasExercises = plan.workout_days?.some(
            (day: any) => day.plan_exercises && day.plan_exercises.length > 0
          );
          
          // 如果新数据包含完整信息，或者缓存中没有该计划，则更新缓存
          if ((hasWorkoutDays && hasExercises) || !newCache.has(plan.id)) {
            newCache.set(plan.id, plan);
          }
          // 否则保留缓存中的完整数据
        });
        setPlansCache(newCache);
      }
      if (currentPlanRes.success && currentPlanRes.data) {
        const plan = currentPlanRes.data.plan as PlanWithDays;
        setCurrentPlanData(plan);
        setPlansCache(prev => new Map(prev).set(plan.id, plan));
      }
      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTemplate = async (template: WorkoutPlan) => {
    if (!userId) return;
    
    try {
      setCopiedId(template.id);
      setActionLoading('copy');
      const result = await copyTemplateToUser(template.id, userId);
      if (result.success && result.data) {
        const newPlan = result.data as PlanWithDays;
        setCurrentPlanData(newPlan);
        setPlansCache(prev => new Map(prev).set(newPlan.id, newPlan));
      } else {
        alert('复制模板失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('复制模板失败:', error);
      alert('复制模板失败，请稍后重试');
    } finally {
      setCopiedId(null);
      setActionLoading(null);
    }
  };

  const handleSetCurrentPlan = async (planId: string) => {
    if (!userId) return;
    
    const previousCurrentPlan = currentPlan;
    const planToSet = userPlans.find(p => p.id === planId) || plansCache.get(planId);
    
    if (planToSet) {
      setCurrentPlanData(planToSet);
    }
    
    try {
      setActionLoading(planId);
      const result = await setCurrentPlan(userId, planId);
      if (!result.success) {
        setCurrentPlanData(previousCurrentPlan);
      }
    } catch (error) {
      console.error('设置当前计划失败:', error);
      setCurrentPlanData(previousCurrentPlan);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('确定要删除这个计划吗？')) return;
    
    const planToDelete = userPlans.find(p => p.id === planId);
    setUserPlans(prev => prev.filter(p => p.id !== planId));
    
    if (currentPlan?.id === planId) {
      setCurrentPlanData(null);
    }
    
    try {
      setActionLoading(planId);
      const result = await deletePlan(planId);
      if (!result.success) {
        if (planToDelete) {
          setUserPlans(prev => [...prev, planToDelete]);
        }
      } else {
        setPlansCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(planId);
          return newCache;
        });
      }
    } catch (error) {
      console.error('删除计划失败:', error);
      if (planToDelete) {
        setUserPlans(prev => [...prev, planToDelete]);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewPlan = async (plan: PlanWithDays) => {
    const cachedPlan = plansCache.get(plan.id);
    
    // 检查缓存中是否有完整数据（包括 plan_exercises）
    const hasFullData = cachedPlan?.workout_days?.some(
      (day: any) => day.plan_exercises && day.plan_exercises.length > 0
    );
    
    // 如果缓存中有完整数据，直接使用
    if (hasFullData && cachedPlan) {
      setViewingPlan(cachedPlan);
      return;
    }
    
    // 否则从服务器获取完整数据
    try {
      setActionLoading(plan.id);
      const result = await getPlanById(plan.id);
      if (result.success && result.data) {
        const fetchedPlan = result.data as PlanWithDays;
        setViewingPlan(fetchedPlan);
        setPlansCache(prev => new Map(prev).set(plan.id, fetchedPlan));
      } else {
        console.error('获取计划详情失败:', result.error);
        alert('获取计划详情失败，请稍后重试');
      }
    } catch (error) {
      console.error('获取计划详情失败:', error);
      alert('获取计划详情失败，请稍后重试');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCustomPlanModal = () => {
    setCustomPlanData({
      name: '',
      description: '',
      goal: 'general',
      experience_level: 'beginner',
      duration_weeks: 8,
    });
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const initialDays: CustomPlanDayData[] = dayNames.map((name, i) => ({
      name,
      focus_muscles: [],
      rest_day: i >= 5,
      exercises: [],
    }));
    setCustomDays(initialDays);
    setShowCustomPlanModal(true);
  };

  const handleToggleRestDay = (dayIndex: number) => {
    setCustomDays(prev => {
      const newDays = [...prev];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        rest_day: !newDays[dayIndex].rest_day,
        exercises: !newDays[dayIndex].rest_day ? [] : newDays[dayIndex].exercises,
      };
      return newDays;
    });
  };

  const handleOpenExerciseSelector = (dayIndex: number) => {
    setCurrentDayIndex(dayIndex);
    setShowExerciseSelector(true);
  };

  const handleExercisesSelected = (exercises: SelectedExercise[]) => {
    setCustomDays(prev => {
      const newDays = [...prev];
      newDays[currentDayIndex] = {
        ...newDays[currentDayIndex],
        exercises,
      };
      return newDays;
    });
    setShowExerciseSelector(false);
  };

  const handleCreateCustomPlan = async () => {
    if (!userId || !customPlanData.name.trim()) return;

    const workoutDaysCount = customDays.filter(d => !d.rest_day).length;
    if (workoutDaysCount === 0) {
      alert('请至少选择一个训练日');
      return;
    }

    try {
      setActionLoading('create-custom');
      const result = await createCustomPlan(userId, {
        name: customPlanData.name,
        description: customPlanData.description,
        goal: customPlanData.goal,
        experience_level: customPlanData.experience_level,
        frequency_per_week: workoutDaysCount,
        duration_weeks: customPlanData.duration_weeks,
        days: customDays.map(day => ({
          name: day.name,
          focus_muscles: day.focus_muscles,
          rest_day: day.rest_day,
          exercises: day.exercises.map(ex => ({
            exercise_id: ex.exercise_id,
            target_sets: ex.target_sets,
            target_reps_min: ex.target_reps_min,
            target_reps_max: ex.target_reps_max,
            target_weight_kg: ex.target_weight_kg,
          })),
        })),
      });

      if (result.success && result.data) {
        const newPlan = result.data as PlanWithDays;
        setUserPlans(prev => [newPlan, ...prev]);
        setPlansCache(prev => new Map(prev).set(newPlan.id, newPlan));
        setShowCustomPlanModal(false);
      }
    } catch (error) {
      console.error('创建自定义计划失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">训练计划</h2>
          <p className="text-xs text-muted-foreground mt-1">管理你的训练计划</p>
        </div>
        <button
          onClick={handleOpenCustomPlanModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建计划
        </button>
      </div>

      {currentPlan && (
        <div className="bg-card rounded-2xl border border-primary/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">当前计划</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-foreground">{currentPlan.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {goalLabels[currentPlan.goal || ''] || currentPlan.goal} · 每周{currentPlan.frequency_per_week}天
              </p>
              {currentPlan.completed_sessions !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  已完成 {currentPlan.completed_sessions} 次训练
                </p>
              )}
            </div>
            <button
              onClick={() => handleViewPlan(currentPlan)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
            >
              查看详情
            </button>
          </div>
        </div>
      )}

      {userPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">我创建的计划</h3>
          {userPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentPlan?.id === plan.id}
              isExpanded={expandedPlanId === plan.id}
              isLoading={actionLoading === plan.id}
              onToggleExpand={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
              onSetCurrent={() => handleSetCurrentPlan(plan.id)}
              onDelete={() => handleDeletePlan(plan.id)}
              onViewDetails={() => handleViewPlan(plan)}
            />
          ))}
        </div>
      )}

      {userPlans.length === 0 && !currentPlan && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <Dumbbell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">你还没有训练计划</p>
          <p className="text-xs text-muted-foreground">从下方模板选择一个开始吧</p>
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">选择模板开始训练</h3>
        <div className="grid gap-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onCopy={() => handleCopyTemplate(template)}
              isCopied={copiedId === template.id}
              isLoading={actionLoading === 'copy'}
            />
          ))}
        </div>
        {templates.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">暂无可用模板</p>
          </div>
        )}
      </div>

      {viewingPlan && (
        <PlanDetailModal
          plan={viewingPlan}
          onClose={() => setViewingPlan(null)}
        />
      )}

      {showCustomPlanModal && (
        <CustomPlanModal
          planData={customPlanData}
          setPlanData={setCustomPlanData}
          days={customDays}
          setDays={setCustomDays}
          onClose={() => setShowCustomPlanModal(false)}
          onCreate={handleCreateCustomPlan}
          onToggleRestDay={handleToggleRestDay}
          onOpenExerciseSelector={handleOpenExerciseSelector}
          isLoading={actionLoading === 'create-custom'}
        />
      )}

      {showExerciseSelector && (
        <ExerciseSelector
          isOpen={showExerciseSelector}
          onClose={() => setShowExerciseSelector(false)}
          onConfirm={handleExercisesSelected}
          initialSelected={customDays[currentDayIndex]?.exercises || []}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  isExpanded,
  isLoading,
  onToggleExpand,
  onSetCurrent,
  onDelete,
  onViewDetails,
}: {
  plan: PlanWithDays;
  isCurrent: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  onToggleExpand: () => void;
  onSetCurrent: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}) {
  const days = plan.workout_days || [];

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden ${
      isCurrent ? 'border-primary/50 bg-primary/5' : 'border-border'
    }`}>
      <div
        className="p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{plan.name}</h3>
              {isCurrent && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  进行中
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {plan.description || '暂无描述'}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>每周{plan.frequency_per_week}天</span>
              </div>
              {plan.duration_weeks && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{plan.duration_weeks}周</span>
                </div>
              )}
              {plan.completed_sessions !== undefined && (
                <span className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                  已完成 {plan.completed_sessions} 次
                </span>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">训练安排</p>
            <div className="flex flex-wrap gap-1">
              {days.map((day: any, idx: number) => (
                <span
                  key={idx}
                  className={`text-[10px] px-2 py-1 rounded ${
                    day.rest_day
                      ? 'bg-secondary text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {day.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              查看详情
            </button>
            {!isCurrent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetCurrent();
                }}
                disabled={isLoading}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                设为当前
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isLoading}
              className="p-2 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onCopy,
  isCopied,
  isLoading,
}: {
  template: WorkoutPlan;
  onCopy: () => void;
  isCopied: boolean;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{template.name}</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {goalLabels[template.goal || ''] || template.goal || '综合'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {template.description}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>每周{template.frequency_per_week}天</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{template.duration_weeks}周</span>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                {levelLabels[template.experience_level || ''] || template.experience_level}
              </span>
            </div>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="pt-3 border-t border-border mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">训练安排</p>
            <div className="flex flex-wrap gap-1">
              {(template as any).workout_days?.map((day: any, idx: number) => (
                <span
                  key={idx}
                  className={`text-[10px] px-2 py-1 rounded ${
                    day.rest_day
                      ? 'bg-secondary text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {day.name}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            disabled={isCopied || isLoading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                已添加到我的计划
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                使用此模板
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function PlanDetailModal({
  plan,
  onClose,
}: {
  plan: PlanWithDays;
  onClose: () => void;
}) {
  const rawWorkoutDays = plan.workout_days || [];
  const restDays = (plan as any).rest_days || [];
  
  const workoutDays = [...rawWorkoutDays].sort((a: any, b: any) => (a.day_order || 0) - (b.day_order || 0));
  
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  
  const displayDays = dayNames.map((name, index) => {
    const dayOrder = index + 1;  // 1-7 对应周一到周日
    const isRestDay = restDays.length > 0 
      ? restDays.includes(dayOrder)
      : false;
    
    if (isRestDay) {
      return { name, isRestDay: true, plan_exercises: null, estimated_duration_minutes: null };
    }
    
    // 尝试按 day_order 精确匹配
    const workoutDay = workoutDays.find((d: any) => d.day_order === dayOrder);
    
    if (!workoutDay) {
      return { name, isRestDay: false, plan_exercises: null, estimated_duration_minutes: null };
    }
    
    return {
      name: workoutDay.name,
      isRestDay: false,
      plan_exercises: workoutDay.plan_exercises,
      estimated_duration_minutes: workoutDay.estimated_duration_minutes,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">{plan.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {goalLabels[plan.goal || '']} · 每周{plan.frequency_per_week}天
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)] space-y-4">
          {displayDays.map((day, idx) => (
            <div key={idx} className="bg-secondary rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{day.name}</h4>
                  {day.isRestDay && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      休息日
                    </span>
                  )}
                </div>
                {day.estimated_duration_minutes && (
                  <span className="text-xs text-muted-foreground">
                    {day.estimated_duration_minutes}分钟
                  </span>
                )}
              </div>
              
              {!day.isRestDay && day.plan_exercises && day.plan_exercises.length > 0 && (
                <div className="space-y-2">
                  {day.plan_exercises.map((pe: any, peIdx: number) => (
                    <div key={peIdx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                          {peIdx + 1}
                        </span>
                        <span className="text-foreground">
                          {pe.exercises?.name || '未知动作'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{pe.target_sets}组</span>
                        {pe.target_reps_min && pe.target_reps_max && (
                          <span>{pe.target_reps_min}-{pe.target_reps_max}次</span>
                        )}
                        {pe.target_weight_kg && (
                          <span>{pe.target_weight_kg}kg</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!day.isRestDay && (!day.plan_exercises || day.plan_exercises.length === 0) && (
                <p className="text-xs text-muted-foreground">暂无动作安排</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomPlanModal({
  planData,
  setPlanData,
  days,
  setDays,
  onClose,
  onCreate,
  onToggleRestDay,
  onOpenExerciseSelector,
  isLoading,
}: {
  planData: {
    name: string;
    description: string;
    goal: string;
    experience_level: string;
    duration_weeks: number;
  };
  setPlanData: React.Dispatch<React.SetStateAction<typeof planData>>;
  days: CustomPlanDayData[];
  setDays: React.Dispatch<React.SetStateAction<CustomPlanDayData[]>>;
  onClose: () => void;
  onCreate: () => void;
  onToggleRestDay: (dayIndex: number) => void;
  onOpenExerciseSelector: (dayIndex: number) => void;
  isLoading: boolean;
}) {
  const workoutDaysCount = days.filter(d => !d.rest_day).length;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-foreground text-lg">创建自定义计划</h3>
            <p className="text-xs text-muted-foreground mt-0.5">设计属于你的训练计划</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">计划名称 *</label>
              <input
                type="text"
                value={planData.name}
                onChange={(e) => setPlanData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：我的增肌计划"
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">计划描述</label>
              <textarea
                value={planData.description}
                onChange={(e) => setPlanData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="简单描述你的训练计划..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">训练目标</label>
                <select
                  value={planData.goal}
                  onChange={(e) => setPlanData(prev => ({ ...prev, goal: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm"
                >
                  <option value="general">综合训练</option>
                  <option value="strength">力量增长</option>
                  <option value="muscle_gain">肌肉增长</option>
                  <option value="fat_loss">减脂</option>
                  <option value="endurance">耐力提升</option>
                  <option value="flexibility">柔韧性</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">经验等级</label>
                <select
                  value={planData.experience_level}
                  onChange={(e) => setPlanData(prev => ({ ...prev, experience_level: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm"
                >
                  <option value="beginner">初级</option>
                  <option value="intermediate">中级</option>
                  <option value="advanced">高级</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">训练天数</label>
                <div className="px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm">
                  <span className="font-medium text-foreground">{workoutDaysCount}</span>
                  <span className="text-muted-foreground"> 天/周</span>
                  <span className="text-xs text-muted-foreground ml-2">(在下方勾选休息日)</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">计划周期（周）</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={planData.duration_weeks}
                  onChange={(e) => setPlanData(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) || 8 }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-4">训练日安排</h4>
            <div className="space-y-3">
              {days.map((day, index) => (
                <div key={index} className="bg-secondary rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        day.rest_day 
                          ? 'bg-secondary text-muted-foreground' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {day.name}
                      </span>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.rest_day}
                          onChange={() => onToggleRestDay(index)}
                          className="w-4 h-4 rounded border-border"
                        />
                        休息日
                      </label>
                    </div>
                  </div>

                  {!day.rest_day && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-muted-foreground">已选动作:</span>
                        <span className="text-xs font-medium text-foreground">{day.exercises.length} 个</span>
                      </div>

                      {day.exercises.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {day.exercises.slice(0, 5).map((ex, exIdx) => (
                            <span
                              key={exIdx}
                              className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary"
                            >
                              {ex.name}
                            </span>
                          ))}
                          {day.exercises.length > 5 && (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                              +{day.exercises.length - 5}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => onOpenExerciseSelector(index)}
                        className="w-full py-2 rounded-lg border border-dashed border-primary/50 text-primary text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {day.exercises.length > 0 ? '编辑动作' : '添加动作'}
                      </button>
                    </>
                  )}

                  {day.rest_day && (
                    <p className="text-xs text-muted-foreground text-center py-2">休息恢复日</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            取消
          </button>
          <button
            onClick={onCreate}
            disabled={!planData.name.trim() || isLoading}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                创建计划
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
