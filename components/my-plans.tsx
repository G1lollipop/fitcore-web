'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Dumbbell, Copy, ChevronRight, ChevronDown, Clock, Calendar,
  Plus, Play, Trash2, Edit, X, Check, Flame, Save, Target
} from 'lucide-react';
import {
  getUserPlansLight, getCurrentPlanLight, getSystemTemplatesLight, copyTemplateToUser,
  setCurrentPlan, deletePlan, getPlanById, createCustomPlan
} from '@/app/actions/plans';
import { logWorkout, batchLogWorkouts } from '@/app/actions/logWorkout';
import { ExerciseSelector, SelectedExercise } from './exercise-selector';
import { DailyLogForm } from './daily-log-form';
import type { Database } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

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

export function MyPlans() {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [userPlans, setUserPlans] = useState<PlanWithDays[]>([]);
  const [currentPlan, setCurrentPlanData] = useState<PlanWithDays | null>(null);
  const [templates, setTemplates] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [todayWorkoutData, setTodayWorkoutData] = useState<{
    plan: PlanWithDays | null;
    todayDay: any;
    exercises: any[];
  } | null>(null);
  const [isLoggingWorkout, setIsLoggingWorkout] = useState(false);
  const [todayWorkoutLogs, setTodayWorkoutLogs] = useState<any[]>([]);

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
          newCache.set(plan.id, plan);
        });
        setPlansCache(newCache);
      }

      if (currentPlanRes.success && currentPlanRes.data) {
        const plan = currentPlanRes.data.plan as PlanWithDays;
        setCurrentPlanData(plan);
        if (plan) {
          setPlansCache(prev => new Map(prev).set(plan.id, plan));
          calculateTodayWorkout(plan);
        }
      }

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data as WorkoutPlan[]);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTodayWorkout = (plan: PlanWithDays) => {
    const days = plan.workout_days || [];
    if (days.length === 0) {
      setTodayWorkoutData(null);
      return;
    }

    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const restDays: number[] = (plan as any).rest_days || [];
    const sortedDays = [...days].sort((a: any, b: any) => (a.day_order || 0) - (b.day_order || 0));
    
    let todayDay: any = null;
    let isRestDay = false;
    
    if (restDays.length > 0 && restDays.includes(todayIndex + 1)) {
      isRestDay = true;
      if (sortedDays.length > 0) {
        todayDay = { ...sortedDays[0], name: '休息日', isRestDay: true };
      }
    } else {
      if (restDays.length > 0) {
        let adjustedIndex = 0;
        let dayCount = 0;
        
        for (let i = 0; i <= todayIndex; i++) {
          if (!restDays.includes(i + 1)) {
            dayCount++;
          }
        }
        
        adjustedIndex = (dayCount - 1) % sortedDays.length;
        if (adjustedIndex < 0) adjustedIndex = 0;
        
        todayDay = sortedDays[adjustedIndex] || sortedDays[0];
      } else {
        todayDay = sortedDays.find((d: any) => d.day_order === todayIndex + 1) || sortedDays[todayIndex % sortedDays.length];
      }
    }

    if (!todayDay) {
      todayDay = sortedDays[0];
    }

    const exercises = (todayDay?.plan_exercises || []).map((pe: any) => ({
      id: pe.id,
      text: `${pe.exercises?.name || '未知动作'} ${pe.target_sets}组 ${pe.target_reps_min}-${pe.target_reps_max}次`,
      exerciseName: pe.exercises?.name,
      sets: pe.target_sets,
      repsMin: pe.target_reps_min,
      repsMax: pe.target_reps_max,
      weight: pe.target_weight_kg,
    }));

    setTodayWorkoutData({
      plan,
      todayDay,
      exercises: isRestDay ? [] : exercises,
    });
  };

  const handleSetCurrentPlan = async (planId: string) => {
    if (!userId) return;
    setActionLoading(planId);
    try {
      const result = await setCurrentPlan(userId, planId);
      if (result.success) {
        const cachedPlan = plansCache.get(planId);
        if (cachedPlan) {
          setCurrentPlanData(cachedPlan);
          calculateTodayWorkout(cachedPlan);
        }
        toast({ title: '设置成功', description: '已将计划设置为当前计划' });
      }
    } catch (error) {
      console.error('设置当前计划失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartWorkout = async () => {
    if (!userId || !todayWorkoutData || todayWorkoutData.exercises.length === 0) return;

    setIsLoggingWorkout(true);
    try {
      const workouts = todayWorkoutData.exercises.map(e => ({
        name: e.exerciseName || '训练',
        sets: e.sets,
        duration_minutes: 15,
        calories_burned: Math.round((e.sets || 3) * 8),
      }));

      const result = await batchLogWorkouts(userId, workouts);
      if (result.success) {
        setTodayWorkoutLogs(prev => [
          ...prev,
          ...todayWorkoutData.exercises.map(e => ({
            workout_name: e.exerciseName,
            sets: e.sets,
            calories_burned: Math.round((e.sets || 3) * 8),
            logged_at: new Date().toISOString(),
          }))
        ]);
        toast({ title: '训练开始', description: `已记录 ${workouts.length} 个训练动作` });
      }
    } catch (error) {
      console.error('开始训练失败:', error);
    } finally {
      setIsLoggingWorkout(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!userId) return;
    if (!confirm('确定要删除这个计划吗？')) return;
    
    setActionLoading(planId);
    try {
      const result = await deletePlan(planId);
      if (result.success) {
        setUserPlans(prev => prev.filter(p => p.id !== planId));
        if (currentPlan?.id === planId) {
          setCurrentPlanData(null);
          setTodayWorkoutData(null);
        }
        toast({ title: '删除成功', description: '计划已删除' });
      }
    } catch (error) {
      console.error('删除计划失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const togglePlanExpand = (planId: string) => {
    setExpandedPlanId(prev => prev === planId ? null : planId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl border border-border p-6 animate-pulse">
          <div className="h-6 bg-secondary rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-secondary rounded"></div>
            <div className="h-20 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {todayWorkoutData && (
        <div className="bg-gradient-to-br from-primary/20 to-accent/10 rounded-2xl border border-primary/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">今日训练</h3>
              <p className="text-sm text-muted-foreground">
                {todayWorkoutData.plan?.name} - {todayWorkoutData.todayDay?.name}
              </p>
            </div>
            {todayWorkoutData.exercises.length > 0 ? (
              <button
                onClick={handleStartWorkout}
                disabled={isLoggingWorkout}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Play size={16} />
                {isLoggingWorkout ? '记录中...' : '开始训练'}
              </button>
            ) : (
              <span className="text-sm text-muted-foreground">休息日</span>
            )}
          </div>
          
          {todayWorkoutData.exercises.length > 0 && (
            <div className="space-y-2">
              {todayWorkoutData.exercises.slice(0, 4).map((ex, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-background/50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {idx + 1}
                  </div>
                  <span className="text-sm text-foreground flex-1">{ex.exerciseName}</span>
                  <span className="text-xs text-muted-foreground">{ex.sets}组</span>
                </div>
              ))}
              {todayWorkoutData.exercises.length > 4 && (
                <p className="text-xs text-muted-foreground text-center">
                  + 还有 {todayWorkoutData.exercises.length - 4} 个动作
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">我的计划</h3>
          <button
            onClick={() => setShowCustomPlanModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Plus size={14} />
            创建计划
          </button>
        </div>

        {userPlans.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">暂无训练计划</p>
            <p className="text-xs text-muted-foreground mt-1">从模板复制或创建新计划开始训练</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userPlans.map(plan => {
              const isCurrent = currentPlan?.id === plan.id;
              const isExpanded = expandedPlanId === plan.id;
              
              return (
                <div key={plan.id} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => togglePlanExpand(plan.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{plan.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded-full">
                            当前
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {plan.frequency_per_week}次/周
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {plan.time_per_session_minutes || 60}分钟
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-border space-y-3">
                      <div className="flex gap-2">
                        {!isCurrent && (
                          <button
                            onClick={() => handleSetCurrentPlan(plan.id)}
                            disabled={actionLoading === plan.id}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            <Check size={12} />
                            设为当前计划
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          disabled={actionLoading === plan.id}
                          className="px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      
                      {plan.workout_days && plan.workout_days.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">训练日</p>
                          {plan.workout_days.map((day: any) => (
                            <div key={day.id} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-secondary/50 rounded">
                              <span className="text-foreground">{day.name}</span>
                              <span className="text-muted-foreground">
                                ({day.plan_exercises?.length || 0}个动作)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">系统模板</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.slice(0, 6).map(template => (
            <div key={template.id} className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground rounded">
                      {levelLabels[template.experience_level as string] || template.experience_level}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {template.frequency_per_week}次/周
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!userId) return;
                  const result = await copyTemplateToUser(template.id, userId, template.name);
                  if (result.success) {
                    loadData();
                    toast({ title: '复制成功', description: '计划已添加到您的计划列表' });
                  }
                }}
                className="w-full mt-3 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
              >
                <Copy size={12} />
                复制模板
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
