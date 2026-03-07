'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Dumbbell, Copy, ChevronRight, Clock, Calendar, Zap, Plus } from 'lucide-react';
import { getSystemTemplates, copyTemplateToUser } from '@/app/actions/plans';
import type { Database } from '@/lib/database.types';

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
type WorkoutDay = Database['public']['Tables']['workout_days']['Row'];

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

export function PlanTemplates() {
  const { userId } = useAuth();
  const [templates, setTemplates] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await getSystemTemplates();
      if (result.success && result.data) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTemplate = async (template: WorkoutPlan) => {
    if (!userId) return;
    
    try {
      setCopiedId(template.id);
      const result = await copyTemplateToUser(template.id, userId);
      if (result.success) {
        console.log('模板复制成功:', result.data);
      }
    } catch (error) {
      console.error('复制模板失败:', error);
    } finally {
      setTimeout(() => setCopiedId(null), 2000);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">训练计划模板</h2>
          <p className="text-xs text-muted-foreground mt-1">选择适合你的训练计划</p>
        </div>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onCopy={() => handleCopyTemplate(template)}
            isCopied={copiedId === template.id}
          />
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">暂无训练模板</p>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onCopy,
  isCopied,
}: {
  template: WorkoutPlan & { workout_days?: WorkoutDay[] };
  onCopy: () => void;
  isCopied: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const days = template.workout_days || [];
  // 所有 workout_days 都是训练日，休息日通过 rest_days 数组判断
  const trainingDays = days;

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
        <div className="px-4 pb-4 space-y-4">
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">训练安排</p>
            <div className="flex flex-wrap gap-1">
              {days.map((day, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary"
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
            disabled={isCopied}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCopied ? (
              <>
                <Zap className="w-4 h-4" />
                已复制到我的计划
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
