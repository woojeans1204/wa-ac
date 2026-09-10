"use client"

import { IconPin, IconPinned, IconX } from "@tabler/icons-react"
import {
  clearRecentAccounts,
  removeSavedAccount,
  toggleSavedAccountPin,
  useSavedAccounts,
  type SavedAccount,
} from "@/lib/saved-accounts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { trackEvent } from "@/lib/analytics"

function accountHref(account: SavedAccount) {
  return account.platform === "Codeforces"
    ? `/codeforces/${encodeURIComponent(account.handle)}#dashboard`
    : `/shadcn?handle=${encodeURIComponent(account.handle)}#dashboard`
}

function AccountRow({ account }: { account: SavedAccount }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
      <a href={accountHref(account)} onClick={() => trackEvent("saved_account_open", { platform: account.platform })} className="min-w-0 flex-1 truncate font-medium">
        {account.handle}
      </a>
      <Badge variant="outline" className="font-normal">{account.platform}</Badge>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={account.pinned ? `Unpin ${account.handle}` : `Pin ${account.handle}`}
        title={account.pinned ? "Unpin" : "Pin"}
        onClick={() => {
          toggleSavedAccountPin(account.platform, account.handle)
          trackEvent("account_pin", { platform: account.platform, value: account.pinned ? "unpin" : "pin" })
        }}
      >
        {account.pinned ? <IconPinned /> : <IconPin />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove ${account.handle}`}
        title="Remove"
        onClick={() => {
          removeSavedAccount(account.platform, account.handle)
          trackEvent("saved_account_remove", { platform: account.platform })
        }}
      >
        <IconX />
      </Button>
    </div>
  )
}

export function SavedAccounts() {
  const accounts = useSavedAccounts()
  const pinned = accounts.filter((account) => account.pinned)
  const recent = accounts.filter((account) => !account.pinned)
  if (!accounts.length) return null

  return (
    <Card size="sm" className="mx-4 mt-6 lg:mx-6">
      <CardContent className={pinned.length && recent.length ? "grid gap-5 md:grid-cols-2" : "grid gap-5"}>
        {pinned.length > 0 && <section className="min-w-0 space-y-1">
          <div className="flex h-7 items-center justify-between px-2">
            <h2 className="text-sm font-medium">Pinned</h2>
          </div>
          {pinned.length
            ? pinned.map((account) => <AccountRow key={`${account.platform}:${account.handle.toLowerCase()}`} account={account} />)
            : <p className="px-2 py-1.5 text-sm text-muted-foreground">Pin an account for quick access.</p>}
        </section>}
        <section className="min-w-0 space-y-1">
          <div className="flex h-7 items-center justify-between px-2">
            <h2 className="text-sm font-medium">Recent searches</h2>
            {recent.length > 0 && <Button type="button" variant="ghost" size="xs" onClick={() => { clearRecentAccounts(); trackEvent("recent_clear") }}>Clear</Button>}
          </div>
          {recent.length
            ? recent.map((account) => <AccountRow key={`${account.platform}:${account.handle.toLowerCase()}`} account={account} />)
            : <p className="px-2 py-1.5 text-sm text-muted-foreground">No recent searches.</p>}
        </section>
      </CardContent>
    </Card>
  )
}
