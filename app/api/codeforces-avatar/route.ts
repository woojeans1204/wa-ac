const ALLOWED_HOSTS = new Set(["userpic.codeforces.org", "codeforces.com"])

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url")
  if (!rawUrl) return new Response("Missing image URL.", { status: 400 })

  let imageUrl: URL
  try {
    imageUrl = new URL(rawUrl)
  } catch {
    return new Response("Invalid image URL.", { status: 400 })
  }

  if (imageUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(imageUrl.hostname) || imageUrl.port || imageUrl.username || imageUrl.password) {
    return new Response("Image host is not allowed.", { status: 403 })
  }

  // Codeforces profile pages serve user pictures through this first-party path.
  // The API still returns the separate userpic host, which can return 503.
  const candidates = imageUrl.hostname === "userpic.codeforces.org"
    ? [new URL(`/userpic.codeforces.org${imageUrl.pathname}`, "https://codeforces.com"), imageUrl]
    : [imageUrl]

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
        signal: AbortSignal.timeout(8_000),
        redirect: "error",
      })
      const contentType = response.headers.get("content-type") || ""
      if (!response.ok || !contentType.startsWith("image/")) {
        await response.body?.cancel()
        continue
      }
      return new Response(response.body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
          "X-Content-Type-Options": "nosniff",
        },
      })
    } catch {
      // Try the next official source; never cache a transient failure.
    }
  }
  return new Response("Could not load avatar.", { status: 502, headers: { "Cache-Control": "no-store" } })
}
