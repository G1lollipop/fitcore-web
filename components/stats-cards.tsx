"use client"

import { TrendingUp, Droplets, Timer, Target, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTransition } from "react"
import { logWater } from "@/app/actions/dashboardActions"
import { useToast } from "@/hooks/use-toast"
import type { WeeklyWorkoutStats } from "@/app/actions/types"

interface StatsCardsProps {
  caloriesBurned?: number
  workoutDuration?: number
  waterIntake?: number
  waterGoal?: number
  userId?: string
  onUpdate?: () => void
  weeklyWorkoutStats?: WeeklyWorkoutStats
}

export function StatsCards({
  caloriesBurned = 0,
  workoutDuration = 0,
  waterIntake = 0,
  waterGoal = 2500,
  userId,
  onUpdate,
  weeklyWorkoutStats,
}: StatsCardsProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const waterLiters = (waterIntake / 1000).toFixed(1)
  const waterGoalLiters = (waterGoal / 1000).toFixed(1)
  const waterProgress = Math.min(Math.round((waterIntake / waterGoal) * 100), 100)

  const weeklyDays = weeklyWorkoutStats?.daysThisWeek ?? 0
  const weeklyChange = weeklyWorkoutStats?.change ?? 0

  const handleAddWater = () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "用户ID不存在",
      })
      return
    }

    startTransition(async () => {
      const result = await logWater(userId, 250)

      if (result.success) {
        toast({
          title: "记录成功",
          description: `已添加 250ml 饮水记录`,
        })
        onUpdate?.()
      } else {
        toast({
          variant: "destructive",
          title: "记录失败",
          description: result.error || "请稍后重试",
        })
      }
    })
  }

  const stats = [
    {
      label: "今日消耗",
      value: caloriesBurned.toString(),
      unit: "kcal",
      icon: TrendingUp,
      change: "今日已消耗",
      positive: true,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "饮水量",
      value: waterLiters,
      unit: "L",
      icon: Droplets,
      change: `目标 ${waterGoalLiters}L (${waterProgress}%)`,
      positive: waterProgress >= 80,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
      showAddButton: true,
    },
    {
      label: "训练时长",
      value: workoutDuration.toString(),
      unit: "分钟",
      icon: Timer,
      change: "今日已完成",
      positive: workoutDuration > 0,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      label: "本周训练",
      value: weeklyDays.toString(),
      unit: "天",
      icon: Target,
      change: weeklyChange > 0 ? `+${weeklyChange} 较上周` : weeklyChange < 0 ? `${weeklyChange} 较上周` : "与上周持平",
      positive: weeklyChange >= 0,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
              <div className={cn("flex items-center justify-center w-7 h-7 rounded-lg", stat.bg)}>
                <Icon size={14} className={stat.color} />
              </div>
            </div>
            <div>
              <div className="flex items-end gap-1">
                <span className={cn("text-2xl font-bold leading-none", stat.color)}>{stat.value}</span>
                <span className="text-sm text-muted-foreground mb-0.5">{stat.unit}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className={cn("text-[11px]", stat.positive ? "text-accent" : "text-muted-foreground")}>
                  {stat.change}
                </p>
                {stat.showAddButton && (
                  <button
                    onClick={handleAddWater}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-chart-3/20 text-chart-3 text-[10px] font-medium hover:bg-chart-3/30 transition-colors disabled:opacity-50"
                  >
                    <Plus size={10} />
                    250ml
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
