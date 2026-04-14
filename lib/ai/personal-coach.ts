import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"]
type DailyStatsRow = Database["public"]["Tables"]["daily_stats"]["Row"]

export interface CoachChatMessage {
  role: "user" | "assistant"
  content: string
}

interface CoachUserContext {
  name: string
  age: number | null
  gender: string | null
  height: number | null
  weight: number | null
  activityLevel: string | null
  targetCalories: number | null
  targetProtein: number | null
  targetCarbs: number | null
  targetFat: number | null
  todayCalories: number
  todayProtein: number
  todayCarbs: number
  todayFat: number
  todayWater: number
  todayCaloriesBurned: number
  todayWorkoutDuration: number
  dietLogs: any[]
  workoutLogs: any[]
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
})

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]
}

async function getCoachUserContext(userId: string): Promise<CoachUserContext> {
  const today = getTodayDate()

  const [settingsResult, dailyStatsResult] = await Promise.all([
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("daily_stats").select("*").eq("user_id", userId).eq("date", today).maybeSingle(),
  ])

  const settings = settingsResult.data as UserSettingsRow | null
  const dailyStats = dailyStatsResult.data as DailyStatsRow | null

  return {
    name: "用户",
    age: settings?.age ?? null,
    gender: settings?.gender ?? null,
    height: settings?.height ?? null,
    weight: settings?.weight ?? null,
    activityLevel: settings?.activity_level ?? null,
    targetCalories: settings?.target_calories ?? null,
    targetProtein: settings?.target_protein ?? null,
    targetCarbs: settings?.target_carbs ?? null,
    targetFat: settings?.target_fat ?? null,
    todayCalories: dailyStats?.total_calories ?? 0,
    todayProtein: dailyStats?.total_protein ?? 0,
    todayCarbs: dailyStats?.total_carbs ?? 0,
    todayFat: dailyStats?.total_fat ?? 0,
    todayWater: dailyStats?.water_intake ?? 0,
    todayCaloriesBurned: dailyStats?.calories_burned ?? 0,
    todayWorkoutDuration: dailyStats?.workout_duration ?? 0,
    dietLogs: (dailyStats?.diet_logs as any[]) ?? [],
    workoutLogs: (dailyStats?.workout_logs as any[]) ?? [],
  }
}

function buildCoachSystemPrompt(context: CoachUserContext): string {
  const genderMap: Record<string, string> = {
    male: "男",
    female: "女",
    other: "其他",
  }

  const activityMap: Record<string, string> = {
    sedentary: "久坐不动",
    light: "轻度活动",
    moderate: "中度活动",
    active: "高度活动",
    very_active: "非常活跃",
  }

  let userInfo = ""

  if (context.age) userInfo += `- 年龄: ${context.age}岁\n`
  if (context.gender) userInfo += `- 性别: ${genderMap[context.gender] || context.gender}\n`
  if (context.height) userInfo += `- 身高: ${context.height}cm\n`
  if (context.weight) userInfo += `- 体重: ${context.weight}kg\n`
  if (context.activityLevel) userInfo += `- 活动水平: ${activityMap[context.activityLevel] || context.activityLevel}\n`

  let targets = ""
  if (context.targetCalories) targets += `- 目标热量: ${context.targetCalories}kcal\n`
  if (context.targetProtein) targets += `- 目标蛋白质: ${context.targetProtein}g\n`
  if (context.targetCarbs) targets += `- 目标碳水: ${context.targetCarbs}g\n`
  if (context.targetFat) targets += `- 目标脂肪: ${context.targetFat}g\n`

  const proteinProgress = context.targetProtein
    ? `${context.todayProtein}/${context.targetProtein}g (${Math.round((context.todayProtein / context.targetProtein) * 100)}%)`
    : `${context.todayProtein}g`
  const carbsProgress = context.targetCarbs
    ? `${context.todayCarbs}/${context.targetCarbs}g (${Math.round((context.todayCarbs / context.targetCarbs) * 100)}%)`
    : `${context.todayCarbs}g`
  const fatProgress = context.targetFat
    ? `${context.todayFat}/${context.targetFat}g (${Math.round((context.todayFat / context.targetFat) * 100)}%)`
    : `${context.todayFat}g`
  const caloriesProgress = context.targetCalories
    ? `${context.todayCalories}/${context.targetCalories}kcal (${Math.round((context.todayCalories / context.targetCalories) * 100)}%)`
    : `${context.todayCalories}kcal`

  let todaySummary = `- 热量摄入: ${caloriesProgress}\n`
  todaySummary += `- 蛋白质: ${proteinProgress}\n`
  todaySummary += `- 碳水化合物: ${carbsProgress}\n`
  todaySummary += `- 脂肪: ${fatProgress}\n`
  todaySummary += `- 饮水量: ${context.todayWater}ml\n`
  todaySummary += `- 运动消耗: ${context.todayCaloriesBurned}kcal\n`
  todaySummary += `- 运动时长: ${context.todayWorkoutDuration}分钟\n`

  let recentDiet = ""
  if (context.dietLogs.length > 0) {
    recentDiet = context.dietLogs
      .slice(-5)
      .map((log: any) => `  - ${log.name || log.food_name || "食物"}: ${log.calories || 0}kcal`)
      .join("\n")
  }

  let recentWorkout = ""
  if (context.workoutLogs.length > 0) {
    recentWorkout = context.workoutLogs
      .slice(-5)
      .map((log: any) => `  - ${log.name || log.exercise_name || "运动"}: ${log.duration || 0}分钟`)
      .join("\n")
  }

  return `你是FitCore智能健身平台的AI健身教练，专业、友善且富有洞察力。

## 你的职责
1. 根据用户的饮食记录和训练数据，提供个性化的健身和营养建议
2. 回答关于增肌、减脂、营养搭配、训练计划等问题
3. 鼓励用户坚持健身目标，保持积极正面的态度
4. 用中文回复，语言简洁易懂，适当使用emoji增加亲和力

## 回复风格
- 专业但易懂，避免过于学术化的术语
- 积极鼓励，给予用户信心
- 实用性强，给出具体可执行的建议
- 适当使用emoji让对话更生动
- 根据用户今日数据给出针对性建议

## 当前用户信息
${userInfo || "- 暂无基本信息"}
${targets ? `\n## 用户目标\n${targets}` : ""}

## 用户今日数据
${todaySummary}
${recentDiet ? `\n### 今日饮食记录\n${recentDiet}` : "- 暂无饮食记录"}
${recentWorkout ? `\n### 今日运动记录\n${recentWorkout}` : "- 暂无运动记录"}

请基于以上信息，为用户提供个性化的健身和营养建议。`
}

export async function coachChatWithHistory(
  userId: string,
  messages: CoachChatMessage[]
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("缺少 OPENAI_API_KEY，无法使用个性化教练模式")
  }

  const context = await getCoachUserContext(userId)
  const systemPrompt = buildCoachSystemPrompt(context)

  const apiMessages = [{ role: "system" as const, content: systemPrompt }, ...messages]

  const response = await openai.chat.completions.create({
    model: "qwen-turbo",
    messages: apiMessages,
    temperature: 0.8,
    max_tokens: 800,
  })

  const reply = response.choices[0]?.message?.content
  if (!reply) {
    throw new Error("AI 返回空内容")
  }

  return reply
}
