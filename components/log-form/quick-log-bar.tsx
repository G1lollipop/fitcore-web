'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CornerDownLeft,
  Dumbbell,
  Flame,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useQuickLog } from '@/hooks/use-quick-log'
import { quickLog, type QuickLogResult } from '@/app/actions/quickLog'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'parsing' | 'success' | 'error'

const SUGGESTIONS = [
  '鸡胸肉 200g',
  '糙米饭 150g + 蒸蛋 2个',
  '深蹲 4x10',
  '跑步 30 分钟',
  '吃了 30g 蛋白粉，做了俯卧撑 50 个',
] as const

export function QuickLogBar() {
  const { open, setOpen, userId, onLogged } = useQuickLog()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<QuickLogResult[]>([])
  const [recents, setRecents] = useState<string[]>([])

  // Reset transient state whenever the dialog re-opens. Recents persist for
  // the lifetime of the page (intentionally local — not in DB).
  useEffect(() => {
    if (!open) return
    setText('')
    setPhase('idle')
    setResults([])
    // Radix manages focus for us, but we want the cursor in the input even
    // when the dialog content was already mounted from a previous open.
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || phase === 'parsing') return
    if (!userId) {
      toast({ variant: 'destructive', title: '尚未登录', description: '请先登录后再记录' })
      return
    }

    setPhase('parsing')
    const res = await quickLog(trimmed, userId)
    if (!res.success) {
      setPhase('error')
      toast({ variant: 'destructive', title: '记录失败', description: res.error })
      return
    }

    setResults(res.items)
    setPhase('success')
    setRecents((prev) => [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, 5))
    onLogged?.()

    const summary = summarizeResults(res.items)
    toast({ title: '已记录', description: summary })
  }, [text, phase, userId, toast, onLogged])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'fixed left-1/2 top-[18vh] z-50 w-[min(92vw,640px)] -translate-x-1/2',
                  'overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/20'
                )}
              >
                <DialogPrimitive.Title className="sr-only">快捷记录</DialogPrimitive.Title>

                <Header onClose={() => setOpen(false)} />

                <InputRow
                  inputRef={inputRef}
                  value={text}
                  onChange={setText}
                  onSubmit={handleSubmit}
                  onKeyDown={onKeyDown}
                  phase={phase}
                  disabled={!userId}
                />

                <Body
                  phase={phase}
                  results={results}
                  recents={recents}
                  onPick={(s) => {
                    setText(s)
                    inputRef.current?.focus()
                  }}
                  onAnother={() => {
                    setText('')
                    setPhase('idle')
                    setResults([])
                    inputRef.current?.focus()
                  }}
                />

                <Footer />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles size={12} />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Quick Log
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface InputRowProps {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  phase: Phase
  disabled?: boolean
}

function InputRow({ inputRef, value, onChange, onSubmit, onKeyDown, phase, disabled }: InputRowProps) {
  const isParsing = phase === 'parsing'

  return (
    <div className="relative px-4 pt-4 pb-3">
      <div
        className={cn(
          'relative flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 transition-shadow',
          'focus-within:border-primary/60 focus-within:shadow-[0_0_0_4px_rgba(0,0,0,0.04)]',
          disabled ? 'opacity-60' : ''
        )}
      >
        <motion.span
          animate={isParsing ? { rotate: 360 } : { rotate: 0 }}
          transition={
            isParsing ? { repeat: Infinity, duration: 1.6, ease: 'linear' } : { duration: 0 }
          }
          className="shrink-0 text-primary"
        >
          {isParsing ? <Loader2 size={16} /> : <Sparkles size={16} />}
        </motion.span>
        <input
          ref={inputRef}
          data-quicklog-input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || isParsing}
          placeholder="说说你刚吃了什么 / 练了什么…  比如「鸡胸肉200g + 跑步30分钟」"
          className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || isParsing || !value.trim()}
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-all',
            value.trim() && !isParsing
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-muted-foreground'
          )}
        >
          {isParsing ? '解析中' : '记录'}
          <CornerDownLeft size={12} />
        </button>
      </div>

      {isParsing && (
        <motion.div
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
          className="absolute bottom-2 left-4 right-4 h-px origin-left bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      )}
    </div>
  )
}

interface BodyProps {
  phase: Phase
  results: QuickLogResult[]
  recents: string[]
  onPick: (s: string) => void
  onAnother: () => void
}

function Body({ phase, results, recents, onPick, onAnother }: BodyProps) {
  return (
    <div className="px-4 pb-4 min-h-[148px]">
      <AnimatePresence mode="wait">
        {phase === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              已记录 · {results.length} 项
            </p>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="space-y-2"
            >
              {results.map((r) => (
                <ResultChip key={r.id} item={r} />
              ))}
            </motion.ul>
            <button
              type="button"
              onClick={onAnother}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              再记一条
              <CornerDownLeft size={11} />
            </button>
          </motion.div>
        ) : phase === 'parsing' ? (
          <motion.div
            key="parsing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              AI 正在解析
            </p>
            <ShimmerRow />
            <ShimmerRow widthClass="w-3/4" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {recents.length > 0 ? (
              <Section title="最近输入">
                <ChipRow items={recents} onPick={onPick} />
              </Section>
            ) : (
              <Section title="试试这些">
                <ChipRow items={SUGGESTIONS as readonly string[]} onPick={onPick} />
              </Section>
            )}
            <p className="pt-1 text-[11px] text-muted-foreground">
              支持一句话同时记录饮食和训练，AI 会自动拆分。
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function ChipRow({ items, onPick }: { items: readonly string[]; onPick: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
        >
          {s}
        </button>
      ))}
    </div>
  )
}

function ResultChip({ item }: { item: QuickLogResult }) {
  const isFood = item.kind === 'food'
  const Icon = isFood ? UtensilsCrossed : Dumbbell
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } },
      }}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5',
        isFood ? 'border-primary/25 bg-primary/[0.04]' : 'border-accent/40 bg-accent/[0.08]'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isFood ? 'bg-primary/15 text-primary' : 'bg-accent/30 text-accent-foreground'
        )}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {isFood
            ? `${item.calories} kcal · 蛋白 ${item.protein}g · 碳水 ${item.carbs}g · 脂肪 ${item.fat}g`
            : `${item.durationMinutes} 分钟${
                item.sets ? ` · ${item.sets} 组` : ''
              } · 消耗 ${item.caloriesBurned} kcal`}
        </p>
      </div>
      <span
        className={cn(
          'flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums',
          isFood ? 'text-primary' : 'text-accent-foreground'
        )}
      >
        {isFood ? (
          <>+{item.calories} kcal</>
        ) : (
          <>
            <Flame size={11} />−{item.caloriesBurned}
          </>
        )}
      </span>
    </motion.li>
  )
}

function ShimmerRow({ widthClass = 'w-full' }: { widthClass?: string }) {
  return (
    <div className={cn('relative h-9 overflow-hidden rounded-xl bg-secondary/60', widthClass)}>
      <motion.div
        className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        animate={{ x: ['0%', '300%'] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
      />
    </div>
  )
}

function Footer() {
  return (
    <div className="flex items-center justify-between border-t border-border/60 bg-secondary/30 px-4 py-2.5 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <Kbd>↵</Kbd> 提交
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Esc</Kbd> 关闭
        </span>
      </div>
      <span className="hidden items-center gap-1 sm:inline-flex">
        <Sparkles size={10} className="text-primary" /> AI 自动识别食物 / 训练
      </span>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded border border-border bg-background px-1 text-[10px] font-medium text-foreground">
      {children}
    </kbd>
  )
}

function summarizeResults(items: QuickLogResult[]): string {
  const parts: string[] = []
  const foods = items.filter((i): i is Extract<QuickLogResult, { kind: 'food' }> => i.kind === 'food')
  const workouts = items.filter(
    (i): i is Extract<QuickLogResult, { kind: 'workout' }> => i.kind === 'workout'
  )
  if (foods.length) {
    const total = foods.reduce((acc, f) => acc + f.calories, 0)
    parts.push(`${foods.length} 项饮食 (+${total} kcal)`)
  }
  if (workouts.length) {
    const total = workouts.reduce((acc, w) => acc + w.caloriesBurned, 0)
    parts.push(`${workouts.length} 项训练 (−${total} kcal)`)
  }
  return parts.join(' · ')
}
