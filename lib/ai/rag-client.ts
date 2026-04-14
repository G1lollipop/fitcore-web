import type { RagChatRequest, RagChatResponse } from "@/lib/ai/types"

const DEFAULT_RAG_SERVICE_URL = "http://127.0.0.1:8000"
const DEFAULT_REQUEST_TIMEOUT_MS = 120000

function getRagServiceUrl(): string {
  return process.env.RAG_SERVICE_URL || DEFAULT_RAG_SERVICE_URL
}

function getRequestTimeoutMs(): number {
  const raw = process.env.RAG_CLIENT_TIMEOUT_MS
  if (!raw) return DEFAULT_REQUEST_TIMEOUT_MS

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT_MS
}

export async function chatWithRag(payload: RagChatRequest): Promise<RagChatResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), getRequestTimeoutMs())

  try {
    const response = await fetch(`${getRagServiceUrl()}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`RAG service error (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as RagChatResponse
    return {
      answer: data.answer,
      citations: data.citations ?? [],
      retrievalMeta: data.retrievalMeta ?? { retrievedCount: 0 },
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
