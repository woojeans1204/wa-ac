"use client"

import * as React from "react"
import { IconCheck, IconCopy, IconDownload, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { copyChartImage, type ChartCopyResult } from "@/lib/share-chart"

export function ChartShareButton({
  chartRef,
  title,
  description,
  fileName,
}: {
  chartRef: React.RefObject<HTMLDivElement | null>
  title: string
  description: string
  fileName: string
}) {
  const [status, setStatus] = React.useState<"idle" | "working" | ChartCopyResult>("idle")
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const run = async () => {
    if (!chartRef.current || status === "working") return
    setStatus("working")
    try {
      const result = await copyChartImage({ chart: chartRef.current, title, description, fileName })
      setStatus(result)
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setStatus("idle"), 2200)
    } catch {
      setStatus("idle")
    }
  }

  const label = status === "copied"
    ? "Chart copied as PNG"
    : status === "downloaded"
      ? "Chart downloaded as PNG"
      : "Copy chart as PNG"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="transition-opacity"
      data-hover-action
      aria-label={label}
      title={label}
      disabled={status === "working"}
      onClick={run}
    >
      {status === "working"
        ? <IconLoader2 className="animate-spin" />
        : status === "downloaded"
          ? <IconDownload />
          : status === "copied"
            ? <IconCheck />
            : <IconCopy />}
    </Button>
  )
}
