export type DietLogItem = {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
};

export type WorkoutLogItem = {
  workout_name: string;
  sets: number | null;
  duration_minutes: number;
  calories_burned: number;
  logged_at: string;
  plan_id?: string | null;
  day_id?: string | null;
};

export type DailyStatsData = {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  diet_logs: DietLogItem[];
};

export type DailyWorkoutStatsData = {
  calories_burned: number;
  workout_duration: number;
  water_intake: number;
  workout_logs: WorkoutLogItem[];
};

export type UserGoals = {
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  water_goal: number;
};

export type TodayStats = {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  calories_burned: number;
  workout_duration: number;
  water_intake: number;
  diet_logs: any[];
  workout_logs: any[];
};

export type WeeklyActivityData = {
  values: number[];
  weekLabel: string;
  todayIndex: number;
};

export type WeeklyWorkoutStats = {
  daysThisWeek: number;
  daysLastWeek: number;
  change: number;
};

export type YesterdayWorkoutLog = {
  text: string;
}[];

export type TodayWorkoutInfo = {
  plan: { id: string; name: string } | null;
  todayDay: { id: string; name: string; isRestDay: boolean } | null;
  exercises: { id: string; text: string; sets?: number; repsMin?: number; repsMax?: number; weight?: number }[];
} | null;

export type DashboardData = {
  goals: UserGoals;
  today: TodayStats;
  weeklyActivity?: WeeklyActivityData;
  weeklyWorkoutStats?: WeeklyWorkoutStats;
  yesterdayWorkout?: YesterdayWorkoutLog;
  todayWorkout?: TodayWorkoutInfo;
};
