"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { UtensilsCrossed, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { logFood } from "@/app/actions/logFood"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import type { DietLogItem } from "@/app/actions/types"
import { supabase } from "@/lib/supabaseClient"

interface NutritionCenterProps {
  userId?: string
  onLogSuccess?: () => void
}

export function NutritionCenter({ userId, onLogSuccess }: NutritionCenterProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [dietData, setDietData] = useState<DietLogItem[]>([])
  const [goals, setGoals] = useState({
    calories: 2500,
    protein: 150,
    carbs: 300,
    fat: 80
  })
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (userId) {
      loadDietData()
    }
  }, [userId, selectedDate])

  const loadDietData = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      
      const { data: settings } = await supabase
        .from('user_settings')
        .select('target_calories, target_protein, target_carbs, target_fat')
        .eq('user_id', userId)
        .single()

      if (settings) {
        setGoals({
          calories: settings.target_calories || 2500,
          protein: settings.target_protein || 150,
          carbs: settings.target_carbs || 300,
          fat: settings.target_fat || 80
        })
      }

      const { data: statsData } = await supabase
        .from('daily_stats')
        .select('diet_logs')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .single()

      if (statsData?.diet_logs) {
        setDietData(statsData.diet_logs as DietLogItem[])
      } else {
        setDietData([])
      }
    } catch (error) {
      console.error('加载饮食数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const handleNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const handleAddFood = async () => {
    if (!inputText.trim() || !userId) return
    setIsSubmitting(true)
    try {
      const result = await logFood(inputText, userId)
      if (result.success) {
        await loadDietData()
        setInputText("")
        toast({ title: "记录成功", description: `已添加: ${result.data?.food_name}` })
        onLogSuccess?.()
      } else {
        toast({ variant: "destructive", title: "记录失败", description: result.error })
      }
    } catch (error) {
      console.error('添加饮食失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCalories = dietData.reduce((sum, log) => sum + (log.calories || 0), 0)
  const totalProtein = dietData.reduce((sum, log) => sum + (log.protein || 0), 0)
  const totalCarbs = dietData.reduce((sum, log) => sum + (log.carbs || 0), 0)
  const totalFat = dietData.reduce((sum, log) => sum + (log.fat || 0), 0)

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">日期选择</h3>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs text-primary hover:underline"
            >
              返回今天
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 text-center py-2 bg-secondary rounded-xl">
            <p className="text-sm font-medium">
              {selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <button
            onClick={handleNextDay}
            disabled={isToday}
            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-base font-bold text-foreground mb-4">营养摄入</h3>
            
            <div className="space-y-4">
              <NutrientBar
                label="热量"
                current={totalCalories}
                target={goals.calories}
                unit="kcal"
                color="bg-orange-500"
              />
              <NutrientBar
                label="蛋白质"
                current={totalProtein}
                target={goals.protein}
                unit="g"
                color="bg-blue-500"
              />
              <NutrientBar
                label="碳水"
                current={totalCarbs}
                target={goals.carbs}
                unit="g"
                color="bg-yellow-500"
              />
              <NutrientBar
                label="脂肪"
                current={totalFat}
                target={goals.fat}
                unit="g"
                color="bg-purple-500"
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-base font-bold text-foreground mb-4">饮食记录</h3>
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFood()}
                placeholder="例：鸡胸肉200g、糙米饭..."
                disabled={isSubmitting}
                className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleAddFood}
                disabled={isSubmitting || !inputText.trim()}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '添加中...' : '添加'}
              </button>
            </div>

            {dietData.length > 0 ? (
              <div className="space-y-2">
                {dietData.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-3 bg-secondary/60 rounded-xl"
                  >
                    <UtensilsCrossed size={16} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{log.food_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.calories}kcal · {log.protein}g蛋白质 · {log.carbs}g碳水 · {log.fat}g脂肪
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无饮食记录
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function NutrientBar({ label, current, target, unit, color }: {
  label: string
  current: number
  target: number
  unit: string
  color: string
}) {
  const percent = Math.min((current / target) * 100, 100)
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">
          {current} / {target}{unit}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
