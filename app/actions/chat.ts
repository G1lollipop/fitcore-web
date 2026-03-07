'use server';

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UserSettingsRow = Database['public']['Tables']['user_settings']['Row'];
type DailyStatsRow = Database['public']['Tables']['daily_stats']['Row'];
type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UserContext {
  name: string;
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  activityLevel: string | null;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayWater: number;
  todayCaloriesBurned: number;
  todayWorkoutDuration: number;
  dietLogs: any[];
  workoutLogs: any[];
}

async function getUserContext(userId: string): Promise<UserContext> {
  const today = new Date().toISOString().split('T')[0];

  const [settingsResult, dailyStatsResult] = await Promise.all([
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single(),
  ]);

  const settings = settingsResult.data as UserSettingsRow | null;
  const dailyStats = dailyStatsResult.data as DailyStatsRow | null;

  return {
    name: '用户',
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
  };
}

function buildSystemPrompt(context: UserContext): string {
  const genderMap: Record<string, string> = {
    male: '男',
    female: '女',
    other: '其他',
  };

  const activityMap: Record<string, string> = {
    sedentary: '久坐不动',
    light: '轻度活动',
    moderate: '中度活动',
    active: '高度活动',
    very_active: '非常活跃',
  };

  let userInfo = '';
  
  if (context.age) userInfo += `- 年龄: ${context.age}岁\n`;
  if (context.gender) userInfo += `- 性别: ${genderMap[context.gender] || context.gender}\n`;
  if (context.height) userInfo += `- 身高: ${context.height}cm\n`;
  if (context.weight) userInfo += `- 体重: ${context.weight}kg\n`;
  if (context.activityLevel) userInfo += `- 活动水平: ${activityMap[context.activityLevel] || context.activityLevel}\n`;

  let targets = '';
  if (context.targetCalories) targets += `- 目标热量: ${context.targetCalories}kcal\n`;
  if (context.targetProtein) targets += `- 目标蛋白质: ${context.targetProtein}g\n`;
  if (context.targetCarbs) targets += `- 目标碳水: ${context.targetCarbs}g\n`;
  if (context.targetFat) targets += `- 目标脂肪: ${context.targetFat}g\n`;

  const proteinProgress = context.targetProtein 
    ? `${context.todayProtein}/${context.targetProtein}g (${Math.round(context.todayProtein / context.targetProtein * 100)}%)`
    : `${context.todayProtein}g`;
  const carbsProgress = context.targetCarbs
    ? `${context.todayCarbs}/${context.targetCarbs}g (${Math.round(context.todayCarbs / context.targetCarbs * 100)}%)`
    : `${context.todayCarbs}g`;
  const fatProgress = context.targetFat
    ? `${context.todayFat}/${context.targetFat}g (${Math.round(context.todayFat / context.targetFat * 100)}%)`
    : `${context.todayFat}g`;
  const caloriesProgress = context.targetCalories
    ? `${context.todayCalories}/${context.targetCalories}kcal (${Math.round(context.todayCalories / context.targetCalories * 100)}%)`
    : `${context.todayCalories}kcal`;

  let todaySummary = `- 热量摄入: ${caloriesProgress}\n`;
  todaySummary += `- 蛋白质: ${proteinProgress}\n`;
  todaySummary += `- 碳水化合物: ${carbsProgress}\n`;
  todaySummary += `- 脂肪: ${fatProgress}\n`;
  todaySummary += `- 饮水量: ${context.todayWater}ml\n`;
  todaySummary += `- 运动消耗: ${context.todayCaloriesBurned}kcal\n`;
  todaySummary += `- 运动时长: ${context.todayWorkoutDuration}分钟\n`;

  let recentDiet = '';
  if (context.dietLogs.length > 0) {
    recentDiet = context.dietLogs.slice(-5).map((log: any) => {
      return `  - ${log.name || log.food_name || '食物'}: ${log.calories || 0}kcal`;
    }).join('\n');
  }

  let recentWorkout = '';
  if (context.workoutLogs.length > 0) {
    recentWorkout = context.workoutLogs.slice(-5).map((log: any) => {
      return `  - ${log.name || log.exercise_name || '运动'}: ${log.duration || 0}分钟`;
    }).join('\n');
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
${userInfo || '- 暂无基本信息'}
${targets ? `\n## 用户目标\n${targets}` : ''}

## 用户今日数据
${todaySummary}
${recentDiet ? `\n### 今日饮食记录\n${recentDiet}` : '- 暂无饮食记录'}
${recentWorkout ? `\n### 今日运动记录\n${recentWorkout}` : '- 暂无运动记录'}

请基于以上信息，为用户提供个性化的健身和营养建议。`;
}

export async function getChatHistory(
  userId: string,
  limit: number = 20
): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
  try {
    console.log('[getChatHistory] 查询用户聊天历史, userId:', userId);
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[getChatHistory] 查询错误:', error);
      return { success: false, error: '获取历史消息失败' };
    }

    console.log('[getChatHistory] 查询到消息数量:', data?.length ?? 0);
    console.log('[getChatHistory] 查询结果:', JSON.stringify(data, null, 2));

    const messages: ChatMessage[] = (data as ChatMessageRow[]).map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content || '',
    }));

    return { success: true, messages };
  } catch (error) {
    console.error('[getChatHistory] 异常:', error);
    return { success: false, error: '获取历史消息失败' };
  }
}

export async function saveChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[saveChatMessage] 保存消息, userId:', userId, 'role:', role, 'content:', content.substring(0, 50) + '...');
    
    const insertData: ChatMessageInsert = {
      user_id: userId,
      role,
      content,
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select();

    if (error) {
      console.error('[saveChatMessage] 保存错误:', error);
      return { success: false, error: '保存消息失败' };
    }

    console.log('[saveChatMessage] 保存成功, 返回数据:', data);
    return { success: true };
  } catch (error) {
    console.error('[saveChatMessage] 异常:', error);
    return { success: false, error: '保存消息失败' };
  }
}

export async function clearChatHistory(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[clearChatHistory] 清除错误:', error);
      return { success: false, error: '清除历史失败' };
    }

    return { success: true };
  } catch (error) {
    console.error('[clearChatHistory] 异常:', error);
    return { success: false, error: '清除历史失败' };
  }
}

export async function chatWithAI(
  userId: string,
  messages: ChatMessage[]
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    console.log('[chatWithAI] 收到对话请求，用户:', userId, '消息数量:', messages.length);
    console.log('[chatWithAI] 对话历史消息:', JSON.stringify(messages, null, 2));

    const userContext = await getUserContext(userId);
    const systemPrompt = buildSystemPrompt(userContext);

    console.log('[chatWithAI] 系统提示词长度:', systemPrompt.length);
    console.log('[chatWithAI] 用户上下文:', JSON.stringify(userContext, null, 2));

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];
    
    console.log('[chatWithAI] 发送给AI的消息数量:', apiMessages.length);

    const response = await openai.chat.completions.create({
      model: 'qwen-turbo',
      messages: apiMessages,
      temperature: 0.8,
      max_tokens: 800,
    });

    const reply = response.choices[0]?.message?.content;
    
    if (!reply) {
      console.error('[chatWithAI] AI 返回空内容');
      return { success: false, error: 'AI 返回空内容' };
    }

    console.log('[chatWithAI] AI 回复:', reply);
    console.log('[chatWithAI] Token 使用:', response.usage);

    return { success: true, reply };
  } catch (error) {
    console.error('[chatWithAI] 调用 AI 出错:', error);
    return { success: false, error: 'AI 服务暂时不可用，请稍后重试' };
  }
}
