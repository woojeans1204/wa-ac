"use client"

import * as React from "react"
import { recordVisitorSession, trackEvent } from "@/lib/analytics"

const ANALYTICS_HOST = "wa-ac.awj1204.workers.dev"
const BEACON_TOKEN = "578e242460c74134b10b4349c4b644e9"

function currentSection() {
  return window.location.hash.slice(1) || (window.location.pathname === "/" ? "home" : "search")
}

function currentPlatform() {
  if (window.location.pathname.startsWith("/codeforces")) return "Codeforces"
  if (window.location.pathname.startsWith("/shadcn")) return "AtCoder"
  return "Home"
}

export function SiteAnalytics() {
  React.useEffect(() => {
    if (window.location.hostname !== ANALYTICS_HOST) return

    const script = document.createElement("script")
    script.type = "module"
    script.src = "https://static.cloudflareinsights.com/beacon.min.js"
    script.dataset.cfBeacon = JSON.stringify({ token: BEACON_TOKEN })
    document.body.appendChild(script)

    let section = currentSection()
    let visibleStartedAt = document.visibilityState === "visible" ? performance.now() : null
    let visibleMilliseconds = 0
    const platform = currentPlatform()

    recordVisitorSession(section, platform)
    trackEvent("page_view", { section, platform })

    const flushDuration = (reason: string) => {
      if (visibleStartedAt != null) {
        visibleMilliseconds += performance.now() - visibleStartedAt
        visibleStartedAt = null
      }
      if (visibleMilliseconds < 1_000) return
      trackEvent("tab_duration", {
        section,
        platform,
        value: reason,
        duration: Math.round(visibleMilliseconds / 100) / 10,
      })
      visibleMilliseconds = 0
    }

    const trackNavigation = () => {
      flushDuration("tab_change")
      section = currentSection()
      if (document.visibilityState === "visible") visibleStartedAt = performance.now()
      trackEvent("tab_view", { section, platform })
    }

    const trackVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushDuration("hidden")
      } else if (visibleStartedAt == null) {
        visibleStartedAt = performance.now()
      }
    }

    const trackPageExit = () => flushDuration("page_exit")
    window.addEventListener("hashchange", trackNavigation)
    window.addEventListener("waac:navigation", trackNavigation)
    window.addEventListener("pagehide", trackPageExit)
    document.addEventListener("visibilitychange", trackVisibility)

    return () => {
      window.removeEventListener("hashchange", trackNavigation)
      window.removeEventListener("waac:navigation", trackNavigation)
      window.removeEventListener("pagehide", trackPageExit)
      document.removeEventListener("visibilitychange", trackVisibility)
      script.remove()
    }
  }, [])

  return null
}

declare global {
  interface WindowEventMap {
    "waac:navigation": Event
  }
}
