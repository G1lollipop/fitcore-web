"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Bot, Send, X, Minimize2, Maximize2, Zap, Loader2, ChevronDown, Trash2, MessageSquarePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  clearChatHistory,
  getChatHistory,
  listChatConversations,
  type ChatConversationSummary,
} from "@/app/actions/chat"
import {
  createConversationId,
  loadOrCreateConversationId,
  persistConversationId,
} from "@/lib/ai/conversation-id"
import type { AgentMode, AgentSSEEvent, Citation } from "@/lib/ai/types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  mode?: AgentMode
  citations?: Citation[]
  toolsUsed?: string[]
  /** 正在流式输出中 */
  isStreaming?: boolean
}

const MODE_LABEL: Record<AgentMode, string> = {
  knowledge: "知识库",
  personal: "个人",
  hybrid: "混合",
  direct: "直接",
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

function sessionSelectLabel(c: ChatConversationSummary, activeId: string): string {
  const short = c.conversationId === activeId ? "当前" : `…${c.conversationId.slice(-6)}`
  const d = c.lastAt ? new Date(c.lastAt) : new Date()
  const md = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`
  const pv = (c.preview || "").replace(/\s+/g, " ").slice(0, 20)
  return pv ? `${short} ${md} · ${pv}` : `${short} ${md}`
}

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
                {msg.isStreaming && (
                  <span className="inline-block w-0.5 h-3.5 bg-foreground/60 ml-0.5 align-middle animate-pulse" />
                )}
              </div>
              {msg.role === "assistant" ? (
                <>
                  {msg.mode || msg.timestamp ? (
                    <div className="flex flex-wrap items-center gap-1.5 px-1 max-w-[260px]">
                      {msg.mode ? (
                        <span
                          className="text-[10px] rounded-md border border-border bg-background/80 px-1.5 py-0.5 text-muted-foreground shrink-0"
                          title={msg.toolsUsed?.length ? `工具: ${msg.toolsUsed.join(", ")}` : undefined}
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
        {/* 仅当等待第一个 token 时显示点点（流式气泡出现后自动消失） */}
        {isTyping && !messages.some((m) => m.isStreaming) && (
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
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  const welcomeMessages = (): Message[] => [
    {
      id: "0",
      role: "assistant",
      content: "你好，我是你的 AI 健身教练！我已分析你今日的饮食和训练记录。有什么想问我的吗？",
      timestamp: now(),
    },
  ]

  const refreshConversationSummaries = useCallback(async () => {
    const r = await listChatConversations(userId)
    if (r.success && r.conversations) setConversations(r.conversations)
  }, [userId])

  const loadChatHistoryFor = useCallback(
    async (cid: string) => {
      if (!cid) return
      setIsLoadingHistory(true)
      const result = await getChatHistory(userId, cid, 80)
      if (result.success && result.messages && result.messages.length > 0) {
        const loadedMessages: Message[] = result.messages.map((m, index) => ({
          id: `history-${index}`,
          role: m.role,
          content: m.content,
          timestamp: "",
        }))
        setMessages(loadedMessages)
      } else {
        setMessages(welcomeMessages())
      }
      setIsLoadingHistory(false)
    },
    [userId]
  )

  useEffect(() => {
    if (!userId) return
    const cid = loadOrCreateConversationId(userId)
    setConversationId(cid)
    void refreshConversationSummaries()
    void loadChatHistoryFor(cid)
  }, [userId, loadChatHistoryFor, refreshConversationSummaries])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const sessionOptions = useMemo(() => {
    const base = [...conversations]
    if (conversationId && !base.some((c) => c.conversationId === conversationId)) {
      base.unshift({
        conversationId,
        lastAt: new Date().toISOString(),
        preview: "（当前新会话）",
      })
    }
    return base
  }, [conversations, conversationId])

  const switchConversation = (cid: string) => {
    if (!cid || cid === conversationId) return
    persistConversationId(userId, cid)
    setConversationId(cid)
    void loadChatHistoryFor(cid)
    void refreshConversationSummaries()
  }

  const startNewChat = () => {
    const next = createConversationId(userId)
    persistConversationId(userId, next)
    setConversationId(next)
    setMessages(welcomeMessages())
    void refreshConversationSummaries()
  }

  const handleClearHistory = async () => {
    if (!conversationId) return
    if (!confirm("确定清除当前会话的所有消息？")) return

    const result = await clearChatHistory(userId, conversationId)
    if (result.success) {
      const next = createConversationId(userId)
      persistConversationId(userId, next)
      setConversationId(next)
      setMessages([
        {
          id: "0",
          role: "assistant",
          content: "当前会话已清除。有什么新问题想问我吗？",
          timestamp: now(),
        },
      ])
      void refreshConversationSummaries()
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    // 立即插入一个空的流式气泡，让用户看到 AI 在"思考"
    const aiMsgId = `ai-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: aiMsgId, role: "assistant", content: "", timestamp: now(), isStreaming: true },
    ])

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          conversationId: conversationId || undefined,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`请求失败 (${response.status})`)
      }

      // 读取 SSE 流
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        // SSE 每条消息以 \n\n 结尾
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""

        for (const block of lines) {
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "))
          if (!dataLine) continue
          const jsonStr = dataLine.slice(6).trim()
          if (!jsonStr) continue

          let event: AgentSSEEvent
          try {
            event = JSON.parse(jsonStr)
          } catch {
            continue
          }

          if (event.type === "token") {
            // 每个 token 到来时实时追加到气泡
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: m.content + event.content } : m
              )
            )
          } else if (event.type === "done") {
            // 流结束：补充元数据，移除 isStreaming 状态
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      isStreaming: false,
                      mode: event.mode,
                      citations: event.citations ?? [],
                      toolsUsed: event.toolsUsed ?? [],
                    }
                  : m
              )
            )
            void refreshConversationSummaries()
          } else if (event.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: event.message || "抱歉，发生了错误", isStreaming: false }
                  : m
              )
            )
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                content: error instanceof Error ? error.message : "抱歉，我暂时无法回答，请稍后再试。",
                isStreaming: false,
              }
            : m
        )
      )
      console.error("[sendMessage] 错误:", error)
    } finally {
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
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <p className="text-sm font-bold text-foreground leading-none">AI 健身教练</p>
            <div className="flex items-center gap-1.5 min-w-0">
              {conversationId ? (
              <select
                value={conversationId}
                onChange={(e) => switchConversation(e.target.value)}
                disabled={isTyping}
                className="min-w-0 flex-1 max-w-[200px] text-[11px] bg-secondary border border-border rounded-lg px-2 py-1.5 truncate"
                aria-label="切换会话"
              >
                {sessionOptions.map((c) => (
                  <option key={c.conversationId} value={c.conversationId}>
                    {sessionSelectLabel(c, conversationId)}
                  </option>
                ))}
              </select>
              ) : (
                <span className="text-[11px] text-muted-foreground">加载会话…</span>
              )}
              <button
                type="button"
                onClick={startNewChat}
                disabled={isTyping}
                className="shrink-0 p-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="新建会话"
              >
                <MessageSquarePlus size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-muted-foreground">个性化建议</span>
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-destructive transition-colors"
            aria-label="清除当前会话"
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
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <p className="text-sm font-bold text-foreground leading-none">AI 健身教练</p>
            <div className="flex items-center gap-1 min-w-0">
              {conversationId ? (
              <select
                value={conversationId}
                onChange={(e) => switchConversation(e.target.value)}
                disabled={isTyping}
                className="min-w-0 flex-1 text-[11px] bg-background/80 border border-border rounded-md px-1.5 py-1 truncate"
                aria-label="切换会话"
              >
                {sessionOptions.map((c) => (
                  <option key={c.conversationId} value={c.conversationId}>
                    {sessionSelectLabel(c, conversationId)}
                  </option>
                ))}
              </select>
              ) : (
                <span className="text-[10px] text-muted-foreground">加载…</span>
              )}
              <button
                type="button"
                onClick={startNewChat}
                disabled={isTyping}
                className="shrink-0 p-1 rounded-md border border-border bg-background/80 text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="新建会话"
              >
                <MessageSquarePlus size={14} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] text-muted-foreground">个性化建议</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
              aria-label="清除当前会话"
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
