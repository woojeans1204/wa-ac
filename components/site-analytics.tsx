"use client"

import * as React from "react"
import { trackEvent } from "@/lib/analytics"

const ANALYTICS_HOST = "wa-ac.awj1204.workers.dev"
const BEACON_TOKEN = "578e242460c74134b10b4349c4b644e9"

function currentSection() {
  return window.location.hash.slice(1) || (window.location.pathname === "/" ? "home" : "search")
}

function currentPlatform() {
  return window.location.pathname.startsWith("/codeforces") ? "Codeforces" : "AtCoder"
}

export function SiteAnalytics() {
  React.useEffect(() => {
    if (window.location.hostname !== ANALYTICS_HOST) return

    const script = document.createElement("script")
    script.type = "module"
    script.src = "https://static.cloudflareinsights.com/beacon.min.js"
    script.dataset.cfBeacon = JSON.stringify({ token: BEACON_TOKEN })
    document.body.appendChild(script)

    trackEvent("page_view", {
      section: currentSection(),
      platform: currentPlatform(),
    })

    const trackHash = () => trackEvent("tab_view", {
      section: currentSection(),
      platform: currentPlatform(),
    })
    window.addEventListener("hashchange", trackHash)

    return () => {
      window.removeEventListener("hashchange", trackHash)
      script.remove()
    }
  }, [])

  return null
}

