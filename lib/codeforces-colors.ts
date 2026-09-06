// CF user-rating color bands, reused to visualize official problem ratings.
export const cfBands = [
  [0, 1200], [1200, 1400], [1400, 1600], [1600, 1900],
  [1900, 2100], [2100, 2400], [2400, Infinity],
] as const

const names = ["gray", "green", "cyan", "blue", "violet", "orange", "red"]

export function cfRatingColor(value?: number | null): string | undefined {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined
  const index = cfBands.findIndex(([min, max]) => value >= min && value < max)
  if (index < 0) return undefined
  const name = names[index]
  return `hsl(from var(--cf-${name}) h calc(s * var(--cf-saturation, 1) * var(--cf-${name}-saturation-scale, 1)) calc(l * var(--cf-brightness, 1)))`
}
