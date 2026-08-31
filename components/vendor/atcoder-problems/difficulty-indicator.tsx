/**
 * Adapted from AtCoderProblems:
 * - atcoder-problems-frontend/src/components/DifficultyCircle.tsx
 * - atcoder-problems-frontend/src/components/TopcoderLikeCircle.tsx
 * https://github.com/kenkoooo/AtCoderProblems
 *
 * MIT License — Copyright (c) 2019 kenkoooo
 * See THIRD_PARTY_NOTICES.md.
 */

import type * as React from "react"

type ProblemState = "solved" | "attempted" | "unattempted"

const ratingBands = [
  { min: 0, name: "gray", color: "#808080", text: "#ffffff" },
  { min: 400, name: "brown", color: "#804000", text: "#ffffff" },
  { min: 800, name: "green", color: "#008000", text: "#ffffff" },
  { min: 1200, name: "cyan", color: "#00C0C0", text: "#18181b" },
  { min: 1600, name: "blue", color: "#0000FF", text: "#ffffff" },
  { min: 2000, name: "yellow", color: "#C0C000", text: "#18181b" },
  { min: 2400, name: "orange", color: "#FF8000", text: "#18181b" },
  { min: 2800, name: "red", color: "#FF0000", text: "#ffffff" },
] as const

function getBand(rating: number) {
  return ratingBands[Math.min(ratingBands.length - 1, Math.floor(Math.max(0, rating) / 400))]
}

// This is the same fill formula used by AtCoderProblems TopcoderLikeCircle.
function getStyleOptions(rating: number): React.CSSProperties {
  const normalized = Math.max(0, rating)
  const band = getBand(normalized)
  const fillRatio = normalized >= 3200 ? 1 : (normalized % 400) / 400
  return {
    borderColor: band.color,
    background: `border-box linear-gradient(to top, ${band.color} ${fillRatio * 100}%, rgba(0,0,0,0) ${fillRatio * 100}%)`,
  }
}

export function AtCoderDifficultyIndicator({ rating, label, state, size = 28 }: { rating?: number | null; label: string; state: ProblemState; size?: number }) {
  if (rating == null) {
    return <span className="inline-flex items-center justify-center rounded-full border border-dashed text-[11px] text-muted-foreground" style={{ width: size, height: size }}>{label}</span>
  }

  const band = getBand(rating)
  const filled = rating >= 3200 ? 1 : (Math.max(0, rating) % 400) / 400
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11px] font-semibold transition-opacity"
      style={{
        ...getStyleOptions(rating),
        width: size,
        height: size,
        color: filled >= 0.55 ? band.text : band.color,
        opacity: state === "unattempted" ? 0.38 : 1,
        boxShadow: state === "attempted" ? "0 0 0 2px #fecaca, 0 0 0 3px #dc2626" : undefined,
      }}
      aria-label={`${label}, difficulty ${rating}, ${state}`}
    >
      {label}
    </span>
  )
}

export function AtCoderDifficultyScale() {
  return (
    <div className="grid w-full grid-cols-4 overflow-hidden rounded-md border sm:grid-cols-8" aria-label="AtCoder difficulty color scale">
      {ratingBands.map((band) => (
        <div key={band.min} className="flex min-h-9 flex-col justify-center px-2 py-1 leading-tight" style={{ backgroundColor: band.color, color: band.text }}>
          <span className="font-mono text-[10px] font-semibold">{band.min}</span>
          <span className="text-[9px] opacity-80">{band.name}</span>
        </div>
      ))}
    </div>
  )
}
