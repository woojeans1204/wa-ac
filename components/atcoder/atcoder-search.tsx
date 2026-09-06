"use client"

import * as React from "react"
import { IconDice5, IconLoader2, IconSearch } from "@tabler/icons-react"
import { toast } from "sonner"
import type { History } from "@/components/ps-types"
import { ShadcnDashboard } from "@/components/shadcn-dashboard/dashboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"
import { recordSavedAccount } from "@/lib/saved-accounts"

export function AtCoderSearch({ initialHistory }: { initialHistory: History }) {
  const [handle, setHandle] = React.useState(initialHistory.user)
  const [history, setHistory] = React.useState(initialHistory)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void fetch("/api/atcoder?warm=1", { signal: controller.signal }).catch(() => undefined)
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [])

  const loadPlayer = async (url: string) => {
    setLoading(true)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.includes("application/json")) {
        throw new Error("The search server returned an invalid response. Please try again.")
      }
      const payload = await response.json() as { history?: History; error?: string }
      if (!response.ok || !payload.history) {
        throw new Error(payload.error || "Could not load this username.")
      }
      setHistory(payload.history)
      setHandle(payload.history.user)
      recordSavedAccount("AtCoder", payload.history.user)
      window.history.replaceState(
        null,
        "",
        `/shadcn?handle=${encodeURIComponent(payload.history.user)}${window.location.hash || "#dashboard"}`
      )
    } catch (cause) {
      const timedOut = cause instanceof Error && (
        cause.name === "TimeoutError" || cause.name === "AbortError"
      )
      toast.error(
        timedOut
          ? "AtCoder search timed out. Please try again."
          : cause instanceof Error
            ? cause.message
            : "Could not load this username."
      )
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("handle")?.trim()
    if (!query || query.toLowerCase() === initialHistory.user.toLowerCase()) return
    const timeout = window.setTimeout(() => {
      setHandle(query)
      void loadPlayer(`/api/atcoder?handle=${encodeURIComponent(query)}`)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [initialHistory.user])

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = handle.trim()
    if (query) void loadPlayer(`/api/atcoder?handle=${encodeURIComponent(query)}`)
  }

  const randomPlayer = () => {
    void loadPlayer(`/api/atcoder?random=1&t=${Date.now()}`)
  }

  const searchForm = (
    <form onSubmit={search} className="flex w-full max-w-md items-center gap-2">
      <Input
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
        placeholder="AtCoder username"
        aria-label="AtCoder username"
        autoCapitalize="none"
        autoCorrect="off"
      />
      <Button type="submit" size="sm" disabled={loading || !handle.trim()}>
        {loading ? <IconLoader2 className="animate-spin" /> : <IconSearch />}
        <span className="hidden md:inline">Search</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={randomPlayer}
        disabled={loading}
      >
        <IconDice5 />
        <span className="hidden md:inline">Random</span>
      </Button>
    </form>
  )

  return (
    <>
      <ShadcnDashboard
        history={history}
        platform="AtCoder"
        headerContent={searchForm}
      />
      <Toaster richColors />
    </>
  )
}
