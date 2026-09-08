"use client"

import * as React from "react"
import { IconDice5, IconLoader2, IconSearch } from "@tabler/icons-react"
import type { History } from "@/components/ps-types"
import { ShadcnDashboard } from "@/components/shadcn-dashboard/dashboard"
import { ShadcnSiteHeader } from "@/components/shadcn-dashboard/shadcn-site-header"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SavedAccounts } from "@/components/saved-accounts"
import { recordSavedAccount } from "@/lib/saved-accounts"

type CodeforcesProfile = {
  handle: string
  avatarUrl?: string | null
  avatarFallbackUrl?: string | null
}

export function CodeforcesSearch({ initialHandle = "" }: { initialHandle?: string }) {
  const [handle, setHandle] = React.useState(initialHandle)
  const [history, setHistory] = React.useState<History | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const loadPlayer = React.useCallback(async (url: string) => {
    setHistory(null)
    setLoading(true)
    setError("")
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(35_000) })
      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.includes("application/json")) {
        throw new Error(
          response.status === 504
            ? "Codeforces search timed out. Please try again."
            : "The search server returned an invalid response. Please try again."
        )
      }
      const payload = await response.json() as { history?: History; error?: string }
      if (!response.ok || !payload.history) throw new Error(payload.error || "Could not load this handle.")
      setHistory(payload.history)
      setHandle(payload.history.user)
      recordSavedAccount("Codeforces", payload.history.user)
      window.history.replaceState(
        null,
        "",
        `/codeforces/${encodeURIComponent(payload.history.user)}${window.location.hash || "#dashboard"}`
      )
    } catch (cause) {
      const timedOut = cause instanceof Error && (
        cause.name === "TimeoutError" || cause.name === "AbortError"
      )
      setError(
        timedOut
          ? "Codeforces search timed out. Please try again."
          : cause instanceof Error
            ? cause.message
            : "Could not load this handle."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const query = initialHandle.trim()
    if (!query) return
    const timeout = window.setTimeout(() => {
      void loadPlayer(`/api/codeforces?handle=${encodeURIComponent(query)}`)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [initialHandle, loadPlayer])

  const profileHandle = history?.user
  const profileAvatarUrl = history?.avatarUrl
  React.useEffect(() => {
    if (!profileHandle || profileAvatarUrl) return
    const controller = new AbortController()
    void fetch(`/api/codeforces?profile=1&handle=${encodeURIComponent(profileHandle)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<{ profile?: CodeforcesProfile }>
      })
      .then((payload) => {
        const profile = payload?.profile
        if (!profile) return
        setHistory((current) => current?.user.toLowerCase() === profile.handle.toLowerCase()
          ? {
              ...current,
              user: profile.handle,
              avatarUrl: profile.avatarUrl ?? null,
              avatarFallbackUrl: profile.avatarFallbackUrl ?? null,
            }
          : current)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [profileHandle, profileAvatarUrl])

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    const query = handle.trim()
    if (query) {
      window.history.replaceState(
        null,
        "",
        `/codeforces/${encodeURIComponent(query)}${window.location.hash || "#dashboard"}`
      )
      void loadPlayer(`/api/codeforces?handle=${encodeURIComponent(query)}`)
    }
  }

  const randomPlayer = () => {
    void loadPlayer(`/api/codeforces?random=1&t=${Date.now()}`)
  }

  const searchForm = (
    <form onSubmit={search} className="flex w-full max-w-md items-center gap-2">
      <Input
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
        placeholder="Codeforces handle"
        aria-label="Codeforces handle"
        autoCapitalize="none"
        autoCorrect="off"
      />
      <Button type="submit" size="sm" aria-label="Search" disabled={loading || !handle.trim()}>
        {loading ? <IconLoader2 className="animate-spin" /> : <IconSearch />}
        <span className="hidden md:inline">Search</span>
      </Button>
      <Button type="button" size="sm" variant="outline" aria-label="Random player" onClick={randomPlayer} disabled={loading}>
        <IconDice5 />
        <span className="hidden md:inline">Random</span>
      </Button>
    </form>
  )

  if (history) {
    return <ShadcnDashboard history={history} platform="Codeforces" headerContent={searchForm} error={error} />
  }

  if (loading) {
    const loadingHandle = handle.trim() || "player"
    return (
      <div className="min-h-screen bg-background">
        <ShadcnSiteHeader>{searchForm}</ShadcnSiteHeader>
        <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-2 py-6 md:px-3 lg:px-4">
          <Card className="mx-4 lg:mx-6">
            <CardHeader className="gap-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-14 shrink-0 rounded-full" />
                <div className="min-w-0 space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <IconLoader2 className="size-4 animate-spin" />
                    <span className="truncate">Loading {loadingHandle}…</span>
                  </CardTitle>
                  <CardDescription>Fetching public Codeforces history.</CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-12 max-w-full" />
                    <Skeleton className="h-5 w-16 max-w-full" />
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>
          <div className="mx-4 flex gap-6 border-y px-2 py-3 lg:mx-6">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-4 w-20" />)}
          </div>
          <Card className="mx-4 lg:mx-6">
            <CardHeader className="space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
            </CardHeader>
          </Card>
        </main>
      </div>
    )
  }

  if (error) {
    const notFound = error === "User not found."
    return (
      <div className="min-h-screen bg-background">
        <ShadcnSiteHeader />
        <main className="mx-auto flex w-full max-w-[1200px] flex-col px-2 py-6 md:px-3 lg:px-4">
          <Card className="mx-4 lg:mx-6">
            <CardHeader className="items-center py-10 text-center">
              <CardTitle>{notFound ? "User not found" : "Couldn’t load this player"}</CardTitle>
              <CardDescription>
                {notFound ? `No Codeforces user named “${handle.trim()}” was found. Check the handle and try again.` : error}
              </CardDescription>
              <div className="w-full max-w-xl pt-3">{searchForm}</div>
            </CardHeader>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ShadcnSiteHeader />
      <main className="mx-auto flex w-full max-w-[1200px] flex-col px-2 py-6 md:px-3 lg:px-4">
        <Card className="mx-4 lg:mx-6">
          <CardHeader>
            <CardTitle>Search Codeforces player</CardTitle>
            <CardDescription>
              Explore contest-by-contest results, rating history, and solve coverage. Enter a Codeforces handle to get started.
            </CardDescription>
            <div className="max-w-xl pt-3">{searchForm}</div>
          </CardHeader>
        </Card>
        <SavedAccounts />
      </main>
    </div>
  )
}
