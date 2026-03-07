import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const viewport: Viewport = {
  themeColor: '#0d0f14',
}

export const metadata: Metadata = {
  title: 'FitCore — AI 健身教练',
  description: '你的智能健身伙伴，追踪饮食、训练，获取 AI 专属建议',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#6366f1',
          colorTextOnPrimaryBackground: '#ffffff',
          colorBackground: '#09090b',
          colorInputBackground: '#18181b',
          colorInputText: '#fafafa',
          borderRadius: '0.625rem',
        },
        elements: {
          formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
          card: 'bg-background border-border',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted-foreground',
          socialButtonsBlockButton: 'bg-secondary border-border text-foreground hover:bg-secondary/80',
          formFieldInput: 'bg-secondary border-border',
          footerActionLink: 'text-primary hover:text-primary/80',
        },
      }}
    >
      <html lang="zh-CN" className="dark">
        <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-background text-foreground`}>
          {children}
          <Toaster />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
