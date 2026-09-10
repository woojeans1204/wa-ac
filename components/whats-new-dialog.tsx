"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { IconSparkles, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { changelog, latestChangelogId } from "@/lib/changelog"

const LAST_SEEN_KEY = "waac:last-seen-update"

export function WhatsNewDialog() {
  const [open, setOpen] = React.useState(false)
  const [hasUnread, setHasUnread] = React.useState(false)

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasUnread(window.localStorage.getItem(LAST_SEEN_KEY) !== latestChangelogId)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      window.localStorage.setItem(LAST_SEEN_KEY, latestChangelogId)
      setHasUnread(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={changeOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={hasUnread ? "What's new, unread updates" : "What's new"}
        >
          <IconSparkles />
          <span className="hidden xl:inline">What&apos;s new</span>
          {hasUnread && (
            <span
              className="absolute right-1 top-1 size-1.5 rounded-full bg-primary ring-2 ring-background"
              aria-hidden="true"
            />
          )}
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-2xl outline-none">
          <div className="pr-10">
            <DialogPrimitive.Title className="text-lg font-semibold">What&apos;s new</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
              Recent updates to WA:AC.
            </DialogPrimitive.Description>
          </div>

          <DialogPrimitive.Close className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <IconX className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="mt-5 max-h-[min(65vh,32rem)] space-y-5 overflow-y-auto pr-2">
            {changelog.map((entry, index) => (
              <article key={entry.id} className={index === 0 ? "" : "border-t pt-5"}>
                <time className="text-xs font-medium text-muted-foreground">{entry.date}</time>
                <h3 className="mt-1 font-semibold">{entry.title}</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {entry.changes.map((change) => (
                    <li key={change} className="flex gap-2">
                      <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-current" aria-hidden="true" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
