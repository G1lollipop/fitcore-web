"use client"

import { cn } from "@/lib/utils"
import { Flame, Beef, Wheat, Droplets } from "lucide-react"
import type { UserGoals } from "@/app/actions/types"

interface NutrientBarProps {
  label: string
  current: number
  goal: number
  unit: string
  barColor: string
  icon: React.ReactNode
}

function NutrientBar({ label, current, goal, unit, barColor, icon }: NutrientBarProps) {
  const pct = Math.min((current / goal) * 100, 100)
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("flex items-center justify-center w-5 h-5 rounded-md", barColor)}>
            {icon}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">{current}</span>/{goal}{unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface NutritionTrackerProps {
  data?: {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
  };
  goals?: UserGoals;
}

export function NutritionTracker({ data, goals }: NutritionTrackerProps) {
  const calorieData = {
    current: data?.total_calories ?? 0,
    goal: goals?.target_calories ?? 2200,
  }
  const calPct = Math.min((calorieData.current / calorieData.goal) * 100, 100)

  const nutrients = [
    {
      label: "蛋白质",
      current: data?.total_protein ?? 0,
      goal: goals?.target_protein ?? 160,
      unit: "g",
      barColor: "bg-primary",
      icon: <Beef size={11} className="text-primary-foreground" />,
    },
    {
      label: "碳水化合物",
      current: data?.total_carbs ?? 0,
      goal: goals?.target_carbs ?? 250,
      unit: "g",
      barColor: "bg-accent",
      icon: <Wheat size={11} className="text-accent-foreground" />,
    },
    {
      label: "脂肪",
      current: data?.total_fat ?? 0,
      goal: goals?.target_fat ?? 70,
      unit: "g",
      barColor: "bg-chart-4",
      icon: <Droplets size={11} className="text-[oklch(0.1_0_0)]" />,
    },
  ]

  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 · 星期${["日", "一", "二", "三", "四", "五", "六"][today.getDay()]}`

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-foreground">今日营养摄入</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
          进行中
        </span>
      </div>

      <div className="flex items-center gap-6 mb-5 p-4 rounded-xl bg-secondary/50">
        <div className="relative shrink-0 w-20 h-20">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className="text-primary"
              strokeDasharray={`${2 * Math.PI * 32}`}
              strokeDashoffset={`${2 * Math.PI * 32 * (1 - calPct / 100)}`}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame size={13} className="text-primary mb-0.5" />
            <span className="text-sm font-bold text-foreground leading-none">{Math.round(calPct)}%</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-bold text-primary leading-none">{calorieData.current}</p>
            <p className="text-[10px] text-muted-foreground mt-1">已摄入</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xl font-bold text-foreground leading-none">{calorieData.goal}</p>
            <p className="text-[10px] text-muted-foreground mt-1">目标</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-accent leading-none">{Math.max(0, calorieData.goal - calorieData.current)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">剩余</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {nutrients.map((n) => (
          <NutrientBar key={n.label} {...n} />
        ))}
      </div>
    </div>
  )
}
