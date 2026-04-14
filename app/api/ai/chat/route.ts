import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { z } from "zod"

import type { AIChatResponse, ChatMode, Citation } from "@/lib/ai/types"
import { chatWithRag } from "@/lib/ai/rag-client"
import { mergeHybridAnswer } from "@/lib/ai/hybrid-merge"
import { classifyChatIntent } from "@/lib/ai/intent"
import { coachChatWithHistory, type CoachChatMessage } from "@/lib/ai/personal-coach"
import { buildUserContext } from "@/lib/ai/user-context"
import type { Database as SupabaseDatabase } from "@/lib/database.types"

const requestSchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  conversationId: z.string().trim().optional(),
})

const supabase = createClient<SupabaseDatabase>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function saveMessage(userId: string, role: "user" | "assistant", content: string) {
  const { error } = await supabase.from("chat_messages").insert({
    user_id: userId,
    role,
    content,
  })

  if (error) {
    console.error("[/api/ai/chat] saveMessage error:", error)
  }
}

async function loadRecentMessages(userId: string, limit: number): Promise<CoachChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role,content")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("[/api/ai/chat] loadRecentMessages error:", error)
    return []
  }

  return (data ?? [])
    .map((row) => ({
      role: (row.role as "user" | "assistant") ?? "user",
      content: row.content ?? "",
    }))
    .filter((m) => m.content.trim().length > 0)
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      )
    }

    const { message, conversationId } = parsed.data
    const startedAt = Date.now()
    const sessionId = conversationId || `fitcore-${userId}-${startedAt}`
    const userContext = await buildUserContext(userId)

    const intent = classifyChatIntent(message)
    const mode: ChatMode = intent.mode

    let answer = ""
    let citations: Citation[] = []
    let retrievedCount = 0

    if (mode === "personal") {
      const history = await loadRecentMessages(userId, 20)
      const chatHistory: CoachChatMessage[] = [...history, { role: "user", content: message }].slice(-12)

      answer = await coachChatWithHistory(userId, chatHistory)
    } else if (mode === "rag") {
      const ragResponse = await chatWithRag({
        query: message,
        sessionId,
        userContext,
      })
      answer = ragResponse.answer
      citations = ragResponse.citations ?? []
      retrievedCount = ragResponse.retrievalMeta?.retrievedCount ?? citations.length
    } else {
      const ragResponse = await chatWithRag({
        query: message,
        sessionId,
        userContext,
      })

      answer = await mergeHybridAnswer({
        userMessage: message,
        userContext,
        knowledgeAnswer: ragResponse.answer,
        citations: ragResponse.citations ?? [],
      })
      citations = ragResponse.citations ?? []
      retrievedCount = ragResponse.retrievalMeta?.retrievedCount ?? citations.length
    }

    await Promise.all([
      saveMessage(userId, "user", message),
      saveMessage(userId, "assistant", answer),
    ])

    const response: AIChatResponse = {
      answer,
      mode,
      citations,
      meta: {
        intent: intent.reason,
        latencyMs: Date.now() - startedAt,
        retrievedCount,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[/api/ai/chat] unexpected error:", error)
    return NextResponse.json(
      { error: "AI 服务暂时不可用，请稍后再试" },
      { status: 500 }
    )
  }
}
