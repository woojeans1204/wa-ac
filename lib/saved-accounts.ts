"use client"

import * as React from "react"

export type SavedPlatform = "AtCoder" | "Codeforces"

export type SavedAccount = {
  platform: SavedPlatform
  handle: string
  lastSearchedAt: number
  pinned: boolean
}

const STORAGE_KEY = "waac:saved-accounts:v1"
const CHANGE_EVENT = "waac:saved-accounts-change"
const RECENT_LIMIT = 8

function accountKey(platform: SavedPlatform, handle: string) {
  return `${platform}:${handle.toLowerCase()}`
}

function readAccounts() {
  if (typeof window === "undefined") return []
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SavedAccount =>
      (item?.platform === "AtCoder" || item?.platform === "Codeforces")
      && typeof item.handle === "string"
      && typeof item.lastSearchedAt === "number"
      && typeof item.pinned === "boolean"
    )
  } catch {
    return []
  }
}

function saveAccounts(accounts: SavedAccount[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // Searching should still work when storage is blocked or unavailable.
  }
}

function limitRecents(accounts: SavedAccount[]) {
  const sorted = accounts.toSorted((a, b) => b.lastSearchedAt - a.lastSearchedAt)
  const pinned = sorted.filter((account) => account.pinned)
  const recent = sorted.filter((account) => !account.pinned).slice(0, RECENT_LIMIT)
  return [...pinned, ...recent]
}

export function recordSavedAccount(platform: SavedPlatform, handle: string) {
  const normalized = handle.trim()
  if (!normalized || typeof window === "undefined") return
  const key = accountKey(platform, normalized)
  const current = readAccounts()
  const existing = current.find((account) => accountKey(account.platform, account.handle) === key)
  saveAccounts(limitRecents([
    {
      platform,
      handle: normalized,
      lastSearchedAt: Date.now(),
      pinned: existing?.pinned ?? false,
    },
    ...current.filter((account) => accountKey(account.platform, account.handle) !== key),
  ]))
}

export function toggleSavedAccountPin(platform: SavedPlatform, handle: string) {
  if (typeof window === "undefined") return
  const key = accountKey(platform, handle)
  const current = readAccounts()
  const existing = current.find((account) => accountKey(account.platform, account.handle) === key)
  const next = existing
    ? current.map((account) => accountKey(account.platform, account.handle) === key
      ? { ...account, pinned: !account.pinned }
      : account)
    : [{ platform, handle, lastSearchedAt: Date.now(), pinned: true }, ...current]
  saveAccounts(limitRecents(next))
}

export function removeSavedAccount(platform: SavedPlatform, handle: string) {
  if (typeof window === "undefined") return
  const key = accountKey(platform, handle)
  saveAccounts(readAccounts().filter((account) => accountKey(account.platform, account.handle) !== key))
}

export function clearRecentAccounts() {
  if (typeof window === "undefined") return
  saveAccounts(readAccounts().filter((account) => account.pinned))
}

export function useSavedAccounts() {
  const [accounts, setAccounts] = React.useState<SavedAccount[]>([])

  React.useEffect(() => {
    const refresh = () => setAccounts(readAccounts())
    refresh()
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  return accounts.toSorted((a, b) => b.lastSearchedAt - a.lastSearchedAt)
}
