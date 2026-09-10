"use client"

export type AnalyticsEvent =
  | "page_view"
  | "tab_view"
  | "tab_duration"
  | "search_start"
  | "search_success"
  | "search_failure"
  | "random_player"
  | "filter_change"
  | "problem_open"
  | "account_pin"
  | "saved_account_open"
  | "saved_account_remove"
  | "recent_clear"
  | "chart_export"

type AnalyticsDimensions = {
  section?: string
  value?: string
  platform?: string
  duration?: number
}

const ANALYTICS_HOST = "wa-ac.awj1204.workers.dev"

export function trackEvent(event: AnalyticsEvent, dimensions: AnalyticsDimensions = {}) {
  if (typeof window === "undefined" || window.location.hostname !== ANALYTICS_HOST) return

  const body = JSON.stringify({ event, ...dimensions })
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }))
    return
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined)
}
