"use client"

import * as React from "react"
import type { ReactNode } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FeedbackDialog } from "@/components/feedback-dialog"
import { WhatsNewDialog } from "@/components/whats-new-dialog"

export function ShadcnSiteHeader({ children }: { children?: ReactNode }) {
  const [visible, setVisible] = React.useState(true)
  const lastScrollY = React.useRef(0)

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current

      if (currentScrollY < 8 || delta < -4) setVisible(true)
      else if (delta > 4) setVisible(false)

      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-40 flex min-h-12 shrink-0 items-center border-b bg-background/95 backdrop-blur transition-transform duration-200 supports-[backdrop-filter]:bg-background/75 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="grid min-h-12 w-full grid-cols-[auto_1fr] items-center gap-x-2 gap-y-2 px-4 py-2 sm:flex sm:gap-1 sm:py-0 lg:gap-2 lg:px-6">
        {/* A native navigation avoids vinext appending "/" to the active hash. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-base font-medium" aria-label="WA:AC home">WA:AC</a>
        {children && (
          <div className="ml-auto w-full max-w-md min-w-0">
            {children}
          </div>
        )}
        <div className="order-3 col-span-2 ml-auto flex items-center gap-2 sm:order-none sm:col-auto">
          <WhatsNewDialog />
          <FeedbackDialog />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
