export type ChatMode = "personal" | "rag" | "hybrid"

export interface Citation {
  id?: string | null
  title: string
  source: string
  snippet: string
  score?: number | null
}

export interface AIChatResponse {
  answer: string
  mode: ChatMode
  citations?: Citation[]
  meta?: {
    intent?: string
    latencyMs?: number
    retrievedCount?: number
  }
}

export interface UserContextPayload {
  profile: {
    age?: number | null
    gender?: string | null
    height?: number | null
    weight?: number | null
    activityLevel?: string | null
  }
  targets: {
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
  }
  today: {
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    water?: number | null
    caloriesBurned?: number | null
    workoutDuration?: number | null
  }
  plan: {
    currentWorkoutPlan?: string | null
    currentPlanId?: string | null
  }
}

export interface RagChatRequest {
  query: string
  sessionId: string
  userContext: UserContextPayload
}

export interface RagChatResponse {
  answer: string
  citations?: Citation[]
  retrievalMeta?: {
    retrievedCount?: number
  }
}
