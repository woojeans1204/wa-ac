"use client"

export type AnalyticsEvent =
  | "page_view"
  | "tab_view"
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
}

const ANALYTICS_HOST = "wa-ac.awj1204.workers.dev"

export function trackEvent(event: AnalyticsEvent, dimensions: AnalyticsDimensions = {}) {
  if (typeof window === "undefined" || window.location.hostname !== ANALYTICS_HOST) return

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, ...dimensions }),
    keepalive: true,
  }).catch(() => undefined)
}

