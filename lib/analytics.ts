"use client"

export type AnalyticsEvent =
  | "page_view"
  | "visitor_new"
  | "visitor_returning"
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
  | "feedback_success"
  | "feedback_failure"

type AnalyticsDimensions = {
  section?: string
  value?: string
  platform?: string
  duration?: number
}

const ANALYTICS_HOST = "wa-ac.awj1204.workers.dev"
const VISITOR_ID_KEY = "waac_analytics_visitor_id"
const SESSION_ID_KEY = "waac_analytics_session_id"
const SESSION_RECORDED_KEY = "waac_analytics_session_recorded"

function createAnonymousId() {
  return crypto.randomUUID()
}

function analyticsIdentity() {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY)
  const isNewVisitor = !visitorId
  if (!visitorId) {
    visitorId = createAnonymousId()
    localStorage.setItem(VISITOR_ID_KEY, visitorId)
  }

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = createAnonymousId()
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }

  return { visitorId, sessionId, isNewVisitor }
}

export function recordVisitorSession(section: string, platform: string) {
  if (typeof window === "undefined" || window.location.hostname !== ANALYTICS_HOST) return
  const { isNewVisitor } = analyticsIdentity()
  if (sessionStorage.getItem(SESSION_RECORDED_KEY)) return
  sessionStorage.setItem(SESSION_RECORDED_KEY, "1")
  trackEvent(isNewVisitor ? "visitor_new" : "visitor_returning", { section, platform })
}

export function trackEvent(event: AnalyticsEvent, dimensions: AnalyticsDimensions = {}) {
  if (typeof window === "undefined" || window.location.hostname !== ANALYTICS_HOST) return

  const { visitorId, sessionId } = analyticsIdentity()
  const body = JSON.stringify({ event, ...dimensions, visitorId, sessionId })
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
