"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, X, Minimize2, Maximize2, Zap, Loader2, ChevronDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { clearChatHistory, getChatHistory } from "@/app/actions/chat"
import {
  createConversationId,
  loadOrCreateConversationId,
  persistConversationId,
} from "@/lib/ai/conversation-id"
import type { AIChatResponse, ChatMode, Citation } from "@/lib/ai/types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  /** 来自 /api/ai/chat；历史记录加载时通常为空 */
  mode?: ChatMode
  citations?: Citation[]
  intentReason?: string
}

const MODE_LABEL: Record<ChatMode, string> = {
  personal: "个人",
  rag: "知识库",
  hybrid: "混合",
}

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim())
}

function CitationsList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null
  return (
    <div className="mt-1 w-full max-w-[260px] rounded-lg border border-border/70 bg-muted/25 px-2 py-1.5 space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground tracking-wide">引用</p>
      <ul className="space-y-1.5">
        {citations.map((c, i) => (
          <li key={c.id ?? `${c.source}-${i}`} className="text-[10px] leading-snug text-foreground/90">
            <span className="font-medium text-foreground">{i + 1}. {c.title}</span>
            {c.source ? (
              <div className="mt-0.5 text-muted-foreground break-all">
                {isHttpUrl(c.source) ? (
                  <a
                    href={c.source.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    {c.source}
                  </a>
                ) : (
                  <span>{c.source}</span>
                )}
              </div>
            ) : null}
            {c.snippet ? (
              <p className="mt-0.5 text-muted-foreground line-clamp-2">{c.snippet}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface AIChatWidgetProps {
  userId: string
}

const SUGGESTED = [
  "今天吃什么能增肌？",
  "帮我制定本周训练计划",
  "我的蛋白质够吗？",
]

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-end px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function ChatBody({
  messages,
  isTyping,
  input,
  setInput,
  sendMessage,
  bottomRef,
  inputRef,
  onClearHistory,
}: {
  messages: Message[]
  isTyping: boolean
  input: string
  setInput: (v: string) => void
  sendMessage: (t: string) => void
  bottomRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLInputElement | null>
  onClearHistory: () => void
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                <Bot size={12} className="text-primary" />
              </div>
            )}
            <div className={cn("flex flex-col gap-0.5", msg.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed max-w-[260px] whitespace-pre-line",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary text-foreground rounded-tl-sm"
                )}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" ? (
                <>
                  {msg.mode || msg.timestamp ? (
                    <div className="flex flex-wrap items-center gap-1.5 px-1 max-w-[260px]">
                      {msg.mode ? (
                        <span
                          className="text-[10px] rounded-md border border-border bg-background/80 px-1.5 py-0.5 text-muted-foreground shrink-0"
                          title={msg.intentReason || undefined}
                        >
                          {MODE_LABEL[msg.mode]}
                        </span>
                      ) : null}
                      {msg.timestamp ? (
                        <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <CitationsList citations={msg.citations ?? []} />
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground px-1">{msg.timestamp}</span>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
              <Bot size={12} className="text-primary" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2 border-t border-border flex gap-1.5 overflow-x-auto shrink-0">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            disabled={isTyping}
            className="shrink-0 px-2.5 py-1.5 rounded-full bg-secondary border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 pb-3 pt-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="问问 AI 教练..."
          disabled={isTyping}
          className="flex-1 bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60 transition-all"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          aria-label="发送"
        >
          {isTyping ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </>
  )
}

export function AIChatWidget({ userId }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  /** 与 RAG session 对齐；按 userId 存 localStorage，刷新不丢 */
  const [conversationId, setConversationId] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!userId) return
    setConversationId(loadOrCreateConversationId(userId))
    loadChatHistory()
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const loadChatHistory = async () => {
    setIsLoadingHistory(true)
    console.log('[AIChatWidget] 加载聊天历史, userId:', userId)
    
    const result = await getChatHistory(userId, 20)
    console.log('[AIChatWidget] 加载结果:', result)
    
    if (result.success && result.messages && result.messages.length > 0) {
      const loadedMessages: Message[] = result.messages.map((m, index) => ({
        id: `history-${index}`,
        role: m.role,
        content: m.content,
        timestamp: "",
      }))
      console.log('[AIChatWidget] 加载的消息数量:', loadedMessages.length)
      setMessages(loadedMessages)
    } else {
      console.log('[AIChatWidget] 没有历史消息，显示欢迎消息')
      setMessages([
        {
          id: "0",
          role: "assistant",
          content: "你好，我是你的 AI 健身教练！我已分析你今日的饮食和训练记录。有什么想问我的吗？",
          timestamp: now(),
        },
      ])
    }
    setIsLoadingHistory(false)
  }

  const handleClearHistory = async () => {
    if (!confirm("确定要清除所有聊天记录吗？")) return
    
    const result = await clearChatHistory(userId)
    if (result.success) {
      const next = createConversationId(userId)
      persistConversationId(userId, next)
      setConversationId(next)
      setMessages([
        {
          id: "0",
          role: "assistant",
          content: "聊天记录已清除。有什么新问题想问我吗？",
          timestamp: now(),
        },
      ])
    }
  }

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: now(),
    }
    
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput("")
    setIsTyping(true)

    console.log('=== AI 健身教练对话记录 ===')
    console.log(`[${now()}] 用户: ${text.trim()}`)
    console.log('[sendMessage] 当前消息列表:', updatedMessages.length, '条')

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text.trim(),
          conversationId: conversationId || undefined,
        }),
      })

      const payload = (await response.json()) as AIChatResponse & { error?: string }
      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || "抱歉，我暂时无法回答，请稍后再试。")
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: payload.answer,
        timestamp: now(),
        mode: payload.mode,
        citations: payload.citations,
        intentReason: payload.meta?.intent,
      }
      setMessages((prev) => [...prev, aiMsg])
      console.log(`[${now()}] AI: ${payload.answer}`)
      console.log("[sendMessage] 返回模式:", payload.mode, "引用数:", payload.citations?.length ?? 0)
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error instanceof Error ? error.message : "抱歉，我暂时无法回答，请稍后再试。",
        timestamp: now(),
      }
      setMessages((prev) => [...prev, errorMsg])
      console.error(`[${now()}] AI 错误:`, error)
    } finally {
      console.log('========================')
      setIsTyping(false)
    }
  }

  const chatBodyProps = { 
    messages, 
    isTyping, 
    input, 
    setInput, 
    sendMessage, 
    bottomRef, 
    inputRef,
    onClearHistory: handleClearHistory,
  }

  if (!isOpen) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-2xl bg-primary shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
          aria-label="打开 AI 健身教练"
        >
          <Bot size={24} className="text-primary-foreground" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-background animate-pulse" />
        </button>
      </>
    )
  }

  return (
    <>
      <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-lg shadow-primary/30 shrink-0">
            <Zap size={17} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-none">AI 健身教练</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-muted-foreground">个性化建议</span>
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-destructive transition-colors"
            aria-label="清除聊天记录"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors"
            aria-label="关闭聊天"
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="flex flex-col flex-1 min-h-0 pb-14">
          {isLoadingHistory ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <ChatBody {...chatBodyProps} />
          )}
        </div>
      </div>

      <div
        className={cn(
          "hidden md:flex fixed bottom-6 right-6 z-50 flex-col rounded-2xl border border-border bg-card shadow-2xl shadow-black/60 transition-all duration-300",
          isMinimized ? "w-72 h-14" : "w-96 h-[580px]"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 rounded-t-2xl bg-secondary/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary shadow-lg shadow-primary/30 shrink-0">
            <Zap size={15} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-none">AI 健身教练</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-muted-foreground">个性化建议</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
              aria-label="清除聊天记录"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isMinimized ? "展开" : "最小化"}
            >
              {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="关闭"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          isLoadingHistory ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <ChatBody {...chatBodyProps} />
          )
        )}
      </div>
    </>
  )
}
