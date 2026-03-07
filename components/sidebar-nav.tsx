"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  UtensilsCrossed,
  Dumbbell,
  BookOpen,
  Settings,
  Zap,
  ChevronRight,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { UserButton, useUser } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useRouter } from "next/navigation"

const navItems = [
  { id: "dashboard", label: "仪表盘", icon: LayoutDashboard },
  { id: "nutrition", label: "饮食中心", icon: UtensilsCrossed },
  { id: "training", label: "训练历史", icon: Dumbbell },
  { id: "plans", label: "我的计划", icon: Calendar },
  { id: "knowledge", label: "知识库", icon: BookOpen },
]

interface SidebarNavProps {
  activeNav: string
  onNavChange: (id: string) => void
}

export function SidebarNav({ activeNav, onNavChange }: SidebarNavProps) {
  const { user } = useUser()
  const router = useRouter()
  const userName = user?.firstName || user?.fullName || "我的账户"

  const handleReassess = () => {
    router.push("/onboarding?reassess=true")
  }

  return (
    <>
      {/* ── Desktop Sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-lg shadow-primary/30">
            <Zap className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground">
              FitCore
            </span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">AI 驱动健身</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            主菜单
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  size={18}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-primary opacity-70" />
                )}
              </button>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <UserButton 
              appearance={{
                baseTheme: dark,
                variables: {
                  colorPrimary: '#f97316',
                  colorText: '#ffffff',
                  colorTextOnPrimaryBackground: '#ffffff',
                  colorTextSecondary: '#a1a1aa',
                  colorBackground: '#18181b',
                  colorInputBackground: '#ffffff',
                  colorInputText: '#000000',
                  colorDanger: '#ef4444',
                  colorAlphaShade: '#27272a',
                  colorAlphaShadeCopy: '#3f3f46',
                },
                elements: {
                  avatarBox: "w-9 h-9",
                  rootBox: "w-full",
                  popoverCard: {
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  },
                  popoverArrow: {
                    backgroundColor: '#18181b',
                    borderTop: '1px solid #3f3f46',
                    borderLeft: '1px solid #3f3f46',
                  },
                  header: {
                    color: '#ffffff',
                  },
                  headerTitle: {
                    color: '#ffffff',
                    fontWeight: '600',
                  },
                  headerSubtitle: {
                    color: '#a1a1aa',
                  },
                  userPreviewMainIdentifier: {
                    color: '#ffffff',
                    fontWeight: '500',
                  },
                  userPreviewSecondaryIdentifier: {
                    color: '#a1a1aa',
                  },
                  userButtonPopoverRoot: {
                    backgroundColor: '#18181b',
                  },
                  userButtonPopoverCard: {
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                  },
                  userButtonTrigger: {
                    color: '#ffffff',
                  },
                  action: {
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#27272a',
                    },
                  },
                  actionIcon: {
                    color: '#ffffff',
                  },
                  actionChevron: {
                    color: '#a1a1aa',
                  },
                  formButtonPrimary: {
                    backgroundColor: '#f97316',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#ea580c',
                    },
                  },
                  formButtonSecondary: {
                    backgroundColor: '#27272a',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#3f3f46',
                    },
                  },
                  formFieldLabel: {
                    color: '#ffffff',
                    fontWeight: '500',
                  },
                  formFieldInput: {
                    backgroundColor: '#ffffff',
                    color: '#000000',
                  },
                  dividerLine: {
                    backgroundColor: '#3f3f46',
                  },
                  dividerText: {
                    color: '#71717a',
                  },
                  actionCard: {
                    backgroundColor: '#27272a',
                  },
                  footer: {
                    color: '#a1a1aa',
                  },
                  footerActionLink: {
                    color: '#f97316',
                    '&:hover': {
                      color: '#fb923c',
                    },
                  },
                  profileSectionPrimaryButton: {
                    backgroundColor: '#f97316',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#ea580c',
                    },
                  },
                  profileSectionSecondaryButton: {
                    backgroundColor: '#27272a',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#3f3f46',
                    },
                  },
                  organizationSwitcherTrigger: {
                    backgroundColor: '#27272a',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#3f3f46',
                    },
                  },
                  organizationSwitcherTriggerIcon: {
                    color: '#ffffff',
                  },
                  organizationSwitcherPopoverItem: {
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#27272a',
                    },
                  },
                  organizationSwitcherPopoverItemIcon: {
                    color: '#ffffff',
                  },
                  navbarButton: {
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#27272a',
                    },
                  },
                  navbarButtonIcon: {
                    color: '#ffffff',
                  },
                  link: {
                    color: '#f97316',
                    '&:hover': {
                      color: '#fb923c',
                    },
                  },
                  icon: {
                    color: '#ffffff',
                  },
                  menuItem: {
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#27272a',
                    },
                  },
                  menuItemIcon: {
                    color: '#ffffff',
                  },
                  menuButton: {
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#27272a',
                    },
                  },
                  menuButtonItem: {
                    color: '#ffffff',
                  },
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-[11px] text-muted-foreground truncate">个人设置</p>
            </div>
          </div>
          <button
            onClick={handleReassess}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <RefreshCw size={12} />
            <span>重新评估营养目标</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar (< md) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeNav === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 relative"
              aria-label={item.label}
            >
              {/* Active pill indicator */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <Icon
                size={20}
                className={cn(
                  "transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors leading-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label.length > 4 ? item.label.slice(0, 4) : item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
