"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { IconMessage, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { trackEvent } from "@/lib/analytics"

type SubmitState = "idle" | "submitting" | "success" | "error"

export function FeedbackDialog() {
  const [open, setOpen] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [status, setStatus] = React.useState<SubmitState>("idle")
  const [error, setError] = React.useState("")

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (message.trim().length < 10 || status === "submitting") return
    setStatus("submitting")
    setError("")

    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          website: form.get("website"),
          section: window.location.hash.slice(1) || "home",
        }),
      })
      const result = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(result?.error || "Could not send feedback.")
      setStatus("success")
      setMessage("")
      trackEvent("feedback_success", { section: window.location.hash.slice(1) || "home" })
    } catch (cause) {
      setStatus("error")
      setError(cause instanceof Error ? cause.message : "Could not send feedback.")
      trackEvent("feedback_failure", { section: window.location.hash.slice(1) || "home" })
    }
  }

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setStatus("idle")
      setError("")
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={changeOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label="Send feedback">
          <IconMessage />
          <span className="hidden lg:inline">Feedback</span>
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-2xl outline-none">
          <div className="pr-10">
            <DialogPrimitive.Title className="text-lg font-semibold">Send feedback</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Submit feedback to WA:AC.
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <IconX className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {status === "success" ? (
            <div className="py-8 text-center">
              <p className="font-medium">Thanks for the feedback.</p>
              <p className="mt-1 text-sm text-muted-foreground">It has been saved successfully.</p>
              <Button type="button" className="mt-5" onClick={() => changeOpen(false)}>Done</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="feedback-message">Feedback</Label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  minLength={10}
                  maxLength={2000}
                  required
                  className="min-h-28 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">{message.length}/2000</p>
              </div>
              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <DialogPrimitive.Close asChild><Button type="button" variant="outline">Cancel</Button></DialogPrimitive.Close>
                <Button type="submit" disabled={message.trim().length < 10 || status === "submitting"}>
                  {status === "submitting" ? "Sending…" : "Send"}
                </Button>
              </div>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
