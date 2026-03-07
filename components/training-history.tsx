"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { 
  Calendar, Dumbbell, Flame, Clock, ChevronLeft, ChevronRight, 
  Activity, Target
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { logWorkout } from "@/app/actions/logWorkout"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/lib/database.types"

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TrainingHistoryProps {
  userId?: string
  onLogSuccess?: () => void
}

interface WorkoutLog {
  workout_name?: string
  text?: string
  sets?: number | null
  duration_minutes?: number
  calories_burned?: number
  logged_at?: string
}

interface CalendarDay {
  day: number | null
  dateStr: string
  hasWorkout: boolean
  workoutCount: number
  totalDuration: number
  totalCalories: number
}

export function TrainingHistory({ userId, onLogSuccess }: TrainingHistoryProps) {
  const { toast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [workoutData, setWorkoutData] = useState<Record<string, WorkoutLog[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0])
  const [inputText, setInputText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (userId) {
      loadWorkoutData()
    }
  }, [userId, selectedMonth])

  const loadWorkoutData = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth()
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)
      
      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('daily_stats')
        .select('date, workout_logs, workout_duration, calories_burned')
        .eq('user_id', userId)
        .gte('date', startStr)
        .lte('date', endStr)
        .gt('workout_duration', 0)

      if (error) {
        console.error('加载训练数据失败:', error)
        return
      }

      const groupedData: Record<string, WorkoutLog[]> = {}
      data?.forEach((item: any) => {
        if (item.workout_logs && item.workout_logs.length > 0) {
          groupedData[item.date] = item.workout_logs as WorkoutLog[]
        }
      })

      setWorkoutData(groupedData)
    } catch (error) {
      console.error('加载训练数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setSelectedMonth(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setSelectedMonth(newDate)
  }

  const handleAddWorkout = async () => {
    if (!inputText.trim() || !userId) return
    setIsSubmitting(true)
    try {
      const result = await logWorkout(inputText, userId)
      if (result.success) {
        await loadWorkoutData()
        setInputText("")
        toast({ title: "记录成功", description: `已添加: ${result.data?.workout_name}` })
        onLogSuccess?.()
      } else {
        toast({ variant: "destructive", title: "记录失败", description: result.error })
      }
    } catch (error) {
      console.error('添加训练失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateCalendarDays = (): CalendarDay[] => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    
    const days: CalendarDay[] = []
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, dateStr: '', hasWorkout: false, workoutCount: 0, totalDuration: 0, totalCalories: 0 })
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const workouts = workoutData[dateStr] || []
      const hasWorkout = workouts.length > 0
      const workoutCount = workouts.length
      const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
      const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0)
      
      days.push({ day: i, dateStr, hasWorkout, workoutCount, totalDuration, totalCalories })
    }
    
    return days
  }

  const getDayClass = (dayData: CalendarDay) => {
    const { day, dateStr, hasWorkout } = dayData
    if (day === null) return "invisible"
    
    const isToday = dateStr === new Date().toISOString().split('T')[0]
    const isSelected = dateStr === selectedDate
    
    return cn(
      "relative rounded-xl flex items-center justify-center text-sm font-medium transition-all cursor-pointer min-h-[44px] md:min-h-[48px]",
      hasWorkout && "bg-gradient-to-br from-accent/80 to-accent text-accent-foreground shadow-md",
      !hasWorkout && isToday && "ring-2 ring-primary bg-primary/5",
      !hasWorkout && !isToday && isSelected && "bg-secondary",
      !hasWorkout && !isToday && !isSelected && "hover:bg-secondary/60 text-muted-foreground hover:text-foreground",
      isSelected && "ring-2 ring-primary"
    )
  }

  const calendarDays = generateCalendarDays()
  const selectedDateData = selectedDate ? workoutData[selectedDate] || [] : []
  const monthStats = Object.values(workoutData).flat()
  const totalWorkouts = monthStats.length
  const totalDuration = monthStats.reduce((sum, logs) => sum + (logs.duration_minutes || 0), 0)
  const totalCalories = monthStats.reduce((sum, logs) => sum + (logs.calories_burned || 0), 0)

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 md:px-5 md:py-4 border-b border-border bg-gradient-to-r from-accent/5 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-foreground">训练日历</h3>
                <p className="text-xs text-muted-foreground hidden md:block">查看每月训练情况</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 md:p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <ChevronLeft size={16} className="md:w-5 md:h-5" />
              </button>
              <span className="text-xs md:text-sm font-medium min-w-[70px] md:min-w-[100px] text-center">
                {monthNames[selectedMonth.getMonth()]}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 md:p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <ChevronRight size={16} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 md:p-4">
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] md:text-xs font-medium text-muted-foreground py-1.5 md:py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {calendarDays.map((dayData, index) => (
              <button
                key={index}
                onClick={() => dayData.day && setSelectedDate(dayData.dateStr)}
                disabled={!dayData.day}
                className={getDayClass(dayData)}
              >
                {dayData.day}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-accent/80 to-accent" />
              <span>有训练</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded ring-2 ring-primary" />
              <span>今日</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card rounded-2xl border border-border p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xs text-muted-foreground">训练次数</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">{totalWorkouts}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground">训练时长</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">{Math.round(totalDuration / 60 * 10) / 10}<span className="text-xs font-normal text-muted-foreground ml-1">h</span></p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-xs text-muted-foreground">消耗热量</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">{totalCalories.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">kcal</span></p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-3 md:p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-xs text-muted-foreground">训练日</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">{Object.keys(workoutData).length}<span className="text-xs font-normal text-muted-foreground ml-1">天</span></p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-accent/5 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-accent" />
              <h3 className="text-sm md:text-base font-bold text-foreground">训练记录</h3>
            </div>
            {selectedDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(selectedDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWorkout()}
              placeholder="记录今日训练..."
              disabled={isSubmitting}
              className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
            <button
              onClick={handleAddWorkout}
              disabled={isSubmitting || !inputText.trim()}
              className="px-4 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-all disabled:opacity-50 shadow-sm hover:shadow"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
              ) : (
                "记录"
              )}
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : selectedDateData.length > 0 ? (
            <div className="space-y-2 md:space-y-3">
              {selectedDateData.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 md:p-4 bg-gradient-to-r from-secondary/50 to-secondary/30 rounded-xl border border-border/50 hover:border-accent/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{log.workout_name || log.text || '训练'}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {log.sets && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {log.sets}组
                        </span>
                      )}
                      {log.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.duration_minutes}分钟
                        </span>
                      )}
                      {log.calories_burned && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {log.calories_burned}kcal
                        </span>
                      )}
                    </div>
                  </div>
                  {log.logged_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(log.logged_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
                <Dumbbell className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {selectedDate === new Date().toISOString().split('T')[0] ? '今天还没有训练记录' : '该日无训练记录'}
              </p>
              <p className="text-xs text-muted-foreground/60">
                点击上方添加训练，开始记录你的健身之旅
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
