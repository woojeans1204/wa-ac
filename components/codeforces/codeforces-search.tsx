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

export function CodeforcesSearch() {
  const [handle, setHandle] = React.useState("")
  const [history, setHistory] = React.useState<History | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const loadPlayer = async (url: string) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(url)
      const payload = await response.json() as { history?: History; error?: string }
      if (!response.ok || !payload.history) throw new Error(payload.error || "Could not load this handle.")
      setHistory(payload.history)
      setHandle(payload.history.user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this handle.")
    } finally {
      setLoading(false)
    }
  }

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = handle.trim()
    if (query) void loadPlayer(`/api/codeforces?handle=${encodeURIComponent(query)}`)
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
      <Button type="submit" size="sm" disabled={loading || !handle.trim()}>
        {loading ? <IconLoader2 className="animate-spin" /> : <IconSearch />}
        <span className="hidden md:inline">Search</span>
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={randomPlayer} disabled={loading}>
        <IconDice5 />
        <span className="hidden md:inline">Random</span>
      </Button>
    </form>
  )

  if (history) {
    return <ShadcnDashboard history={history} platform="Codeforces" headerContent={searchForm} />
  }

  return (
    <div className="min-h-screen bg-background">
      <ShadcnSiteHeader />
      <main className="mx-auto flex w-full max-w-[1400px] flex-col py-6">
        <Card className="mx-4 lg:mx-6">
          <CardHeader>
            <CardTitle>Search Codeforces player</CardTitle>
            <CardDescription>
              Enter an exact handle or discover a random recently active rated player.
            </CardDescription>
            <div className="max-w-xl pt-3">{searchForm}</div>
            {error && <p className="pt-2 text-sm text-destructive">{error}</p>}
          </CardHeader>
        </Card>
        {loading && (
          <Card size="sm" className="mx-4 mt-6 lg:mx-6">
            <CardHeader className="flex flex-row items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  )
}
