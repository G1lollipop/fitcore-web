"use client"

import { useState, useTransition, useEffect } from "react"
import { UtensilsCrossed, Dumbbell, Plus, Check, X, Mic, Camera, ClipboardList, RotateCcw, Loader2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { logFood, deleteDietLog } from "@/app/actions/logFood"
import { logWorkout, deleteWorkoutLog, batchLogWorkouts } from "@/app/actions/logWorkout"
import type { DietLogItem, WorkoutLogItem, YesterdayWorkoutLog } from "@/app/actions/types"
import { useToast } from "@/hooks/use-toast"

interface LogEntry {
  id: string
  text: string
  time: string
}

function TagBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-xs text-foreground border border-border">
      {label}
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`删除 ${label}`}
      >
        <X size={10} />
      </button>
    </span>
  )
}

function MediaButton({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode
  label: string
  color: string
}) {
  const [flash, setFlash] = useState(false)

  const handleClick = () => {
    setFlash(true)
    setTimeout(() => setFlash(false), 800)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-xl border border-border transition-all shrink-0",
        flash
          ? `${color} border-transparent scale-95`
          : "bg-secondary text-muted-foreground hover:text-foreground hover:border-border/60 active:scale-95"
      )}
    >
      {icon}
    </button>
  )
}

interface LogSectionProps {
  icon: React.ReactNode
  title: string
  placeholder: string
  accentColor: string
  accentText: string
  entries: LogEntry[]
  onAdd: (text: string) => void
  onRemove: (id: string) => void
  showWorkoutActions?: boolean
  onCopyYesterday?: () => void
  onImportPlan?: () => void
  isSubmitting?: boolean
  todayWorkoutInfo?: {
    planName?: string
    dayName?: string
    isRestDay?: boolean
    exerciseCount?: number
  } | null
  loadingWorkout?: boolean
  hasYesterdayWorkout?: boolean
}

function LogSection({
  icon,
  title,
  placeholder,
  accentColor,
  accentText,
  entries,
  onAdd,
  onRemove,
  showWorkoutActions = false,
  onCopyYesterday,
  onImportPlan,
  isSubmitting = false,
  todayWorkoutInfo,
  loadingWorkout = false,
  hasYesterdayWorkout = false,
}: LogSectionProps) {
  const [input, setInput] = useState("")
  const [added, setAdded] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleAdd = () => {
    if (!input.trim() || isSubmitting) return
    onAdd(input.trim())
    setInput("")
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleImport = () => {
    setImporting(true)
    setTimeout(() => {
      onImportPlan?.()
      setImporting(false)
    }, 900)
  }

  const isWorkout = showWorkoutActions

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className={cn("flex items-center justify-center w-8 h-8 rounded-xl shrink-0", accentColor)}>
          {icon}
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={placeholder}
            disabled={isSubmitting}
            className="w-full bg-secondary border border-border rounded-xl pl-3.5 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
          />
        </div>

        <MediaButton
          icon={<Mic size={15} />}
          label="语音录入"
          color="bg-primary/20 text-primary border-primary/40"
        />
        <MediaButton
          icon={<Camera size={15} />}
          label="拍照识别"
          color={isWorkout ? "bg-accent/20 text-accent border-accent/40" : "bg-primary/20 text-primary border-primary/40"}
        />

        <button
          onClick={handleAdd}
          disabled={isSubmitting}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl transition-all shrink-0 disabled:opacity-50",
            added
              ? "bg-accent text-accent-foreground scale-95"
              : `${accentColor} ${accentText} hover:opacity-90 active:scale-95`
          )}
          aria-label="添加记录"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : added ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {showWorkoutActions && (
        <div className="space-y-2">
          {todayWorkoutInfo && !loadingWorkout && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
              <Calendar size={14} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {todayWorkoutInfo.planName} - {todayWorkoutInfo.dayName}
                </p>
                {todayWorkoutInfo.isRestDay ? (
                  <p className="text-[10px] text-muted-foreground">今天是休息日</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    {todayWorkoutInfo.exerciseCount} 个动作待完成
                  </p>
                )}
              </div>
            </div>
          )}
          {loadingWorkout && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary">
              <Loader2 size={14} className="text-muted-foreground animate-spin" />
              <p className="text-xs text-muted-foreground">加载今日计划...</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopyYesterday}
              disabled={!hasYesterdayWorkout}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all active:scale-95",
                hasYesterdayWorkout
                  ? "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/60"
                  : "bg-secondary/50 border-border/50 text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              <RotateCcw size={12} className="shrink-0" />
              复制昨日计划
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || loadingWorkout}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all active:scale-95",
                importing || loadingWorkout
                  ? "bg-accent/10 border-accent/30 text-accent cursor-wait"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/60"
              )}
            >
              <ClipboardList size={12} className="shrink-0" />
              {importing ? "导入中..." : "导入我的计划表"}
            </button>
          </div>
        </div>
      )}

      {entries.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-1">
              <TagBadge label={e.text} onRemove={() => onRemove(e.id)} />
              <span className="text-[10px] text-muted-foreground">{e.time}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">暂无记录，快去添加吧~</p>
      )}
    </div>
  )
}

interface DailyLogFormProps {
  userId?: string;
  onLogSuccess?: () => void;
  initialDietLogs?: DietLogItem[];
  initialWorkoutLogs?: WorkoutLogItem[];
  yesterdayWorkout?: YesterdayWorkoutLog;
  todayWorkout?: {
    plan: { id: string; name: string } | null;
    todayDay: { id: string; name: string; isRestDay: boolean } | null;
    exercises: { id: string; text: string; sets?: number; repsMin?: number; repsMax?: number; weight?: number }[];
  } | null;
  compact?: boolean;
}

export function DailyLogForm({ 
  userId, 
  onLogSuccess, 
  initialDietLogs = [], 
  initialWorkoutLogs = [],
  yesterdayWorkout = [],
  todayWorkout,
  compact = false
}: DailyLogFormProps) {
  const { toast } = useToast()
  const [isDietPending, startDietTransition] = useTransition()
  const [isWorkoutPending, startWorkoutTransition] = useTransition()

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  const [dietEntries, setDietEntries] = useState<LogEntry[]>([])
  const [workoutEntries, setWorkoutEntries] = useState<LogEntry[]>([])

  useEffect(() => {
    const entries: LogEntry[] = initialDietLogs.map((log) => ({
      id: log.id || `legacy-diet-${log.logged_at}`,
      text: log.food_name,
      time: new Date(log.logged_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    }))
    setDietEntries(entries)
  }, [initialDietLogs])

  useEffect(() => {
    const entries: LogEntry[] = initialWorkoutLogs.map((log) => ({
      id: log.id || `legacy-workout-${log.logged_at}`,
      text: log.workout_name,
      time: new Date(log.logged_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    }))
    setWorkoutEntries(entries)
  }, [initialWorkoutLogs])

  const addDiet = (text: string) => {
    if (!userId) return
    startDietTransition(async () => {
      const result = await logFood(text, userId)

      if (result.success && result.data) {
        setDietEntries((prev) => [
          ...prev,
          { id: Date.now().toString(), text: result.data!.food_name, time: now() },
        ])
        onLogSuccess?.()
        toast({
          title: "记录成功",
          description: `已添加: ${result.data.food_name} (${result.data.calories} kcal)`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "记录失败",
          description: result.error || "请稍后重试",
        })
      }
    })
  }

  const addWorkout = (text: string) => {
    if (!userId) return
    startWorkoutTransition(async () => {
      const result = await logWorkout(text, userId)

      if (result.success && result.data) {
        setWorkoutEntries((prev) => [
          ...prev,
          { id: Date.now().toString(), text: result.data!.workout_name, time: now() },
        ])
        onLogSuccess?.()
        toast({
          title: "记录成功",
          description: `已添加: ${result.data.workout_name} (${result.data.calories_burned} kcal)`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "记录失败",
          description: result.error || "请稍后重试",
        })
      }
    })
  }

  const removeDiet = (id: string) => {
    if (!dietEntries.some((e) => e.id === id)) return

    startDietTransition(async () => {
      const result = await deleteDietLog(userId!, id)
      if (result.success) {
        setDietEntries((prev) => prev.filter((e) => e.id !== id))
        onLogSuccess?.()
        toast({
          title: "删除成功",
          description: "已删除该饮食记录",
        })
      } else {
        toast({
          variant: "destructive",
          title: "删除失败",
          description: result.error || "请稍后重试",
        })
      }
    })
  }
  
  const removeWorkout = (id: string) => {
    if (!workoutEntries.some((e) => e.id === id)) return

    startWorkoutTransition(async () => {
      const result = await deleteWorkoutLog(userId!, id)
      if (result.success) {
        setWorkoutEntries((prev) => prev.filter((e) => e.id !== id))
        onLogSuccess?.()
        toast({
          title: "删除成功",
          description: "已删除该训练记录",
        })
      } else {
        toast({
          variant: "destructive",
          title: "删除失败",
          description: result.error || "请稍后重试",
        })
      }
    })
  }

  const handleCopyYesterday = () => {
    if (!userId || !yesterdayWorkout || yesterdayWorkout.length === 0) {
      toast({
        title: "无昨日记录",
        description: "昨天没有训练记录",
      })
      return
    }

    const newEntries = yesterdayWorkout.filter((p) => !workoutEntries.some((e) => e.text === p.text))

    if (newEntries.length === 0) {
      toast({
        title: "已存在",
        description: "昨日的训练记录已全部存在",
      })
      return
    }

    startWorkoutTransition(async () => {
      const workouts = newEntries.map((e) => ({
        name: e.text,
        duration_minutes: 15,
        calories_burned: 50,
      }))

      const result = await batchLogWorkouts(userId, workouts)

      if (result.success) {
        const t = now()
        setWorkoutEntries((prev) => [
          ...prev,
          ...newEntries.map((p) => ({
            id: `y-${Date.now()}-${p.text}`,
            text: p.text,
            time: t,
          })),
        ])
        onLogSuccess?.()
        toast({
          title: "已复制",
          description: `已复制 ${newEntries.length} 条昨日训练记录`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "复制失败",
          description: result.error || "请稍后重试",
        })
      }
    })
  }

  const handleImportPlan = () => {
    if (!userId) return
    
    if (!todayWorkout || !todayWorkout.exercises.length) {
      toast({
        title: "无可用计划",
        description: "请先在训练计划中选择一个计划",
      })
      return
    }
    
    if (todayWorkout.todayDay?.isRestDay) {
      toast({
        title: "今天是休息日",
        description: `${todayWorkout.todayDay.name} - 好好休息，明天继续加油！`,
      })
      return
    }
    
    const newExercises = todayWorkout.exercises.filter(
      (e) => !workoutEntries.some((entry) => entry.text === e.text)
    )

    if (newExercises.length === 0) {
      toast({
        title: "已存在",
        description: "今日计划的动作已全部存在",
      })
      return
    }

    startWorkoutTransition(async () => {
      const workouts = newExercises.map((e) => ({
        name: e.text,
        sets: e.sets,
        duration_minutes: 15,
        calories_burned: 50,
      }))

      const result = await batchLogWorkouts(userId, workouts)

      if (result.success) {
        const t = now()
        setWorkoutEntries((prev) => [
          ...prev,
          ...newExercises.map((e) => ({
            id: `pl-${Date.now()}-${e.id}`,
            text: e.text,
            time: t,
          })),
        ])
        onLogSuccess?.()
        toast({
          title: "已导入今日计划",
          description: `${todayWorkout.plan?.name} - ${todayWorkout.todayDay?.name}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "导入失败",
          description: result.error || "请稍后重试",
        })
      }
    })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <LogSection
        icon={<UtensilsCrossed size={16} className="text-primary-foreground" />}
        title="今天吃了什么"
        placeholder="例：鸡胸肉200g、糙米饭..."
        accentColor="bg-primary"
        accentText="text-primary-foreground"
        entries={dietEntries}
        onAdd={addDiet}
        onRemove={removeDiet}
        isSubmitting={isDietPending}
      />
      <LogSection
        icon={<Dumbbell size={16} className="text-accent-foreground" />}
        title="练了什么"
        placeholder="例：深蹲4x10、跑步30分钟..."
        accentColor="bg-accent"
        accentText="text-accent-foreground"
        entries={workoutEntries}
        onAdd={addWorkout}
        onRemove={removeWorkout}
        showWorkoutActions
        onCopyYesterday={handleCopyYesterday}
        onImportPlan={handleImportPlan}
        isSubmitting={isWorkoutPending}
        todayWorkoutInfo={todayWorkout ? {
          planName: todayWorkout.plan?.name,
          dayName: todayWorkout.todayDay?.name,
          isRestDay: todayWorkout.todayDay?.isRestDay,
          exerciseCount: todayWorkout.exercises.length,
        } : null}
        hasYesterdayWorkout={yesterdayWorkout && yesterdayWorkout.length > 0}
      />
    </div>
  )
}
