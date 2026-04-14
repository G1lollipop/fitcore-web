"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { DailyLogForm } from "@/components/daily-log-form"
import { StatsCards } from "@/components/stats-cards"
import { AIChatWidget } from "@/components/ai-chat-widget"
import { MyPlans } from "@/components/my-plans"
import { NutritionCenter } from "@/components/nutrition-center"
import { TrainingHistory } from "@/components/training-history"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell, Search } from "lucide-react"
import { getDashboardData } from "@/app/actions/dashboardActions"
import type { DashboardData, WeeklyActivityData, WeeklyWorkoutStats, YesterdayWorkoutLog } from "@/app/actions/types"

export default function DashboardPage() {
  const { userId, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("dashboard")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)

  const currentUserId = userId ?? undefined
  const userName = user?.firstName || user?.fullName || "健身达人"
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 6) return "夜深了"
    if (hour < 12) return "早上好"
    if (hour < 14) return "中午好"
    if (hour < 18) return "下午好"
    if (hour < 22) return "晚上好"
    return "夜深了"
  }

  const fetchDashboardData = useCallback(async () => {
    if (!currentUserId) return
    try {
      const data = await getDashboardData(currentUserId)
      setDashboardData(data)
    } catch (error) {
      console.error('获取仪表盘数据失败:', error)
    } finally {
      setIsPageLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in')
      return
    }
  }, [isLoaded, userId, router])

  useEffect(() => {
    if (isLoaded && !dashboardData) {
      fetchDashboardData()
    } else if (isLoaded) {
      setIsPageLoading(false)
    }
  }, [isLoaded, fetchDashboardData, dashboardData])

  const handleLogSuccess = useCallback(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav activeNav={activeNav} onNavChange={setActiveNav} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {activeNav === "dashboard" && "数据仪表盘"}
              {activeNav === "nutrition" && "饮食中心"}
              {activeNav === "training" && "训练历史"}
              {activeNav === "plans" && "我的计划"}
              {activeNav === "knowledge" && "知识库"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getGreeting()}，{userName} 👋 今天状态不错，继续加油！
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all text-sm">
              <Search size={14} />
              <span className="hidden sm:inline text-xs">搜索...</span>
            </button>
            <button className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
          </div>
        </header>

        <div className="flex-1 px-4 md:px-6 py-5 overflow-y-auto space-y-5 pb-28 md:pb-8">
          {activeNav === "dashboard" && (
            <>
              {isPageLoading ? (
                <DashboardSkeleton />
              ) : (
                <>
                  <StatsCards
                    caloriesBurned={dashboardData?.today.calories_burned}
                    workoutDuration={dashboardData?.today.workout_duration}
                    waterIntake={dashboardData?.today.water_intake}
                    waterGoal={dashboardData?.goals.water_goal}
                    userId={currentUserId}
                    onUpdate={handleLogSuccess}
                    weeklyWorkoutStats={dashboardData?.weeklyWorkoutStats}
                  />

                  <div>
                    <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full bg-primary inline-block" />
                      快速记录
                    </h2>
                    <DailyLogForm
                      userId={currentUserId}
                      onLogSuccess={handleLogSuccess}
                      initialDietLogs={dashboardData?.today.diet_logs ?? []}
                      initialWorkoutLogs={dashboardData?.today.workout_logs ?? []}
                      yesterdayWorkout={dashboardData?.yesterdayWorkout}
                      todayWorkout={dashboardData?.todayWorkout}
                      compact
                    />
                  </div>

                  <WeeklyActivity data={dashboardData?.weeklyActivity} />
                </>
              )}
            </>
          )}

          {activeNav === "nutrition" && (
            <NutritionCenter
              userId={currentUserId}
              onLogSuccess={handleLogSuccess}
            />
          )}

          {activeNav === "training" && (
            <TrainingHistory
              userId={currentUserId}
              onLogSuccess={handleLogSuccess}
            />
          )}

          {activeNav === "plans" && (
            <MyPlans />
          )}

          {activeNav === "knowledge" && <KnowledgeBase />}
        </div>
      </main>

      {currentUserId && <AIChatWidget userId={currentUserId} />}
    </div>
  )
}

interface WeeklyActivityProps {
  data?: WeeklyActivityData
}

function WeeklyActivity({ data }: WeeklyActivityProps) {
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
  const values = data?.values ?? [0, 0, 0, 0, 0, 0, 0]
  const today = data?.todayIndex ?? 0
  const weekLabel = data?.weekLabel ?? ""

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-foreground">本周活跃度</h2>
        <span className="text-xs text-muted-foreground">{weekLabel}</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const val = values[i]
          const isToday = i === today
          return (
            <div key={day} className="flex flex-col items-center gap-2">
              <div
                className="w-full aspect-square rounded-xl flex items-center justify-center relative transition-transform hover:scale-105"
                style={{
                  backgroundColor:
                    val === 0
                      ? "var(--color-secondary)"
                      : `oklch(from var(--color-primary) l c h / ${val / 100})`,
                }}
              >
                {val > 0 && (
                  <span className="text-[10px] font-bold text-primary">{val}%</span>
                )}
                {isToday && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                )}
              </div>
              <span
                className={
                  isToday
                    ? "text-[11px] font-bold text-primary"
                    : "text-[11px] text-muted-foreground"
                }
              >
                {day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface WorkoutLogProps {
  workoutLogs?: Array<{ workout_name?: string; text?: string; sets?: number | null; calories_burned?: number; logged_at?: string }>
}

function WorkoutLog({ workoutLogs }: WorkoutLogProps) {
  const logs = workoutLogs ?? []

  if (logs.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-5">
        <h2 className="text-base font-bold text-foreground mb-4">今日训练记录</h2>
        <p className="text-sm text-muted-foreground">暂无训练记录，快去记录你的训练吧！</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h2 className="text-base font-bold text-foreground mb-4">今日训练记录</h2>
      <div className="space-y-2">
        {logs.map((w, index) => {
          const name = w.workout_name || w.text || "未知训练"
          const time = w.logged_at ? new Date(w.logged_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""
          return (
            <div
              key={index}
              className="flex items-center gap-4 px-4 py-3 rounded-xl bg-secondary/60 border border-border"
            >
              <div className="w-2 h-2 rounded-full shrink-0 bg-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{name}</p>
                {w.sets && <p className="text-xs text-muted-foreground">{w.sets} 组</p>}
              </div>
              {w.calories_burned && (
                <span className="text-xs font-semibold text-muted-foreground">{w.calories_burned} kcal</span>
              )}
              {time && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-accent/15 text-accent">
                  {time}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KnowledgeBase() {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h2 className="text-base font-bold text-foreground mb-4">知识库</h2>
      <p className="text-sm text-muted-foreground">知识库功能开发中...</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <Skeleton className="h-5 w-24 mb-4" />
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <Skeleton className="h-5 w-24 mb-4" />
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  )
}
