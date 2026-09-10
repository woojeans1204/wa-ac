"use client"

export type AnalyticsEvent =
  | "page_view"
  | "visitor_new"
  | "visitor_returning"
  | "return_visit"
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
const LAST_ACTIVITY_KEY = "waac_analytics_last_activity"
const HAS_RETURNED_KEY = "waac_analytics_has_returned"
const SESSION_TIMEOUT_MS = 30 * 60 * 1_000

let visitorSessionRecorded = false

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

  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = createAnonymousId()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }

  return { visitorId, sessionId, isNewVisitor }
}

export function recordVisitorSession(section: string, platform: string) {
  if (typeof window === "undefined" || window.location.hostname !== ANALYTICS_HOST) return
  if (visitorSessionRecorded) return
  visitorSessionRecorded = true

  const now = Date.now()
  const { isNewVisitor } = analyticsIdentity()
  const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY))
  const isReturningSession = !isNewVisitor && lastActivity > 0 && now - lastActivity >= SESSION_TIMEOUT_MS

  if (isReturningSession) {
    localStorage.setItem(SESSION_ID_KEY, createAnonymousId())
    trackEvent("return_visit", { section, platform })

    if (!localStorage.getItem(HAS_RETURNED_KEY)) {
      localStorage.setItem(HAS_RETURNED_KEY, "1")
      trackEvent("visitor_returning", { section, platform })
    }
  } else if (isNewVisitor) {
    trackEvent("visitor_new", { section, platform })
  }

  localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
}

export function trackEvent(event: AnalyticsEvent, dimensions: AnalyticsDimensions = {}) {
  if (typeof window === "undefined" || window.location.hostname !== ANALYTICS_HOST) return

  const { visitorId, sessionId } = analyticsIdentity()
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
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
