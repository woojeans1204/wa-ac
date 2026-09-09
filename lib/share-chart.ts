const SVG_NS = "http://www.w3.org/2000/svg"

export type ChartCopyResult = "copied" | "downloaded"

function inlineSvgStyles(source: SVGSVGElement, clone: SVGSVGElement) {
  const sourceNodes = [source, ...source.querySelectorAll<SVGElement>("*")]
  const cloneNodes = [clone, ...clone.querySelectorAll<SVGElement>("*")]
  const properties = [
    "color",
    "fill",
    "fill-opacity",
    "font-family",
    "font-size",
    "font-weight",
    "opacity",
    "stroke",
    "stroke-dasharray",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-opacity",
    "stroke-width",
    "text-anchor",
  ]

  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index]
    if (!target) return
    const style = getComputedStyle(node)
    properties.forEach((property) => {
      const value = style.getPropertyValue(property)
      if (value) target.style.setProperty(property, value)
    })
  })
}

function textNode(value: string, x: number, y: number, size: number, color: string, weight = "400") {
  const text = document.createElementNS(SVG_NS, "text")
  text.setAttribute("x", String(x))
  text.setAttribute("y", String(y))
  text.setAttribute("fill", color)
  text.setAttribute("font-family", "Arial, sans-serif")
  text.setAttribute("font-size", String(size))
  text.setAttribute("font-weight", weight)
  text.textContent = value
  return text
}

function appendChartLegend(
  exportSvg: SVGSVGElement,
  chart: HTMLElement,
  sourceBounds: DOMRect,
  offsetX: number,
  offsetY: number,
  scale: number
) {
  const items = chart.querySelectorAll<HTMLElement>("[data-slot=chart-legend-item]")
  items.forEach((item) => {
    const swatch = item.querySelector<HTMLElement>("[data-slot=chart-legend-swatch]")
    const label = item.querySelector<HTMLElement>("[data-slot=chart-legend-label]")
    if (!label) return

    if (swatch) {
      const bounds = swatch.getBoundingClientRect()
      const style = getComputedStyle(swatch)
      const rect = document.createElementNS(SVG_NS, "rect")
      rect.setAttribute("x", String(offsetX + (bounds.left - sourceBounds.left) * scale))
      rect.setAttribute("y", String(offsetY + (bounds.top - sourceBounds.top) * scale))
      rect.setAttribute("width", String(bounds.width * scale))
      rect.setAttribute("height", String(bounds.height * scale))
      rect.setAttribute("rx", String(2 * scale))
      rect.setAttribute("fill", style.backgroundColor)
      exportSvg.append(rect)
    }

    const bounds = label.getBoundingClientRect()
    const style = getComputedStyle(label)
    const fontSize = Number.parseFloat(style.fontSize) * scale
    const text = textNode(
      label.textContent ?? "",
      offsetX + (bounds.left - sourceBounds.left) * scale,
      offsetY + (bounds.top - sourceBounds.top) * scale + fontSize,
      fontSize,
      style.color,
      style.fontWeight
    )
    text.setAttribute("font-family", style.fontFamily)
    exportSvg.append(text)
  })
}

async function chartPng(chart: HTMLElement, title: string, description: string) {
  const source = chart.querySelector<SVGSVGElement>("svg.recharts-surface")
  if (!source) throw new Error("Chart is not ready.")

  const bounds = source.getBoundingClientRect()
  if (!bounds.width || !bounds.height) throw new Error("Chart is not visible.")

  const width = 1200
  const chartWidth = width - 80
  const chartHeight = Math.round(bounds.height * (chartWidth / bounds.width))
  const height = chartHeight + 160
  const card = chart.closest<HTMLElement>("[data-slot=card]")
  const cardStyle = getComputedStyle(card ?? document.body)
  const titleElement = card?.querySelector<HTMLElement>("[data-slot=card-title]")
  const descriptionElement = card?.querySelector<HTMLElement>("[data-slot=card-description]")
  const background = cardStyle.backgroundColor
  const foreground = getComputedStyle(titleElement ?? document.body).color
  const muted = getComputedStyle(descriptionElement ?? document.body).color

  const exportSvg = document.createElementNS(SVG_NS, "svg")
  exportSvg.setAttribute("xmlns", SVG_NS)
  exportSvg.setAttribute("width", String(width))
  exportSvg.setAttribute("height", String(height))
  exportSvg.setAttribute("viewBox", `0 0 ${width} ${height}`)

  const backdrop = document.createElementNS(SVG_NS, "rect")
  backdrop.setAttribute("width", String(width))
  backdrop.setAttribute("height", String(height))
  backdrop.setAttribute("rx", "24")
  backdrop.setAttribute("fill", background)
  exportSvg.append(backdrop)
  exportSvg.append(textNode(title, 40, 50, 28, foreground, "600"))
  exportSvg.append(textNode(description, 40, 84, 18, muted))

  const clone = source.cloneNode(true) as SVGSVGElement
  inlineSvgStyles(source, clone)
  clone.setAttribute("x", "40")
  clone.setAttribute("y", "112")
  clone.setAttribute("width", String(chartWidth))
  clone.setAttribute("height", String(chartHeight))
  exportSvg.append(clone)
  appendChartLegend(exportSvg, chart, bounds, 40, 112, chartWidth / bounds.width)

  const svgBlob = new Blob([new XMLSerializer().serializeToString(exportSvg)], {
    type: "image/svg+xml;charset=utf-8",
  })
  const objectUrl = URL.createObjectURL(svgBlob)

  try {
    const image = new Image()
    image.decoding = "async"
    image.src = objectUrl
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Could not create chart image.")
    context.drawImage(image, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode chart image.")), "image/png")
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function copyChartImage({
  chart,
  title,
  description,
  fileName,
}: {
  chart: HTMLElement
  title: string
  description: string
  fileName: string
}): Promise<ChartCopyResult> {
  const blob = await chartPng(chart, title, description)

  if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      return "copied"
    } catch {
      // Fall through to a download when image clipboard access is unavailable.
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return "downloaded"
}
