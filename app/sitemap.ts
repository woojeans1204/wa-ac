import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site-url"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/codeforces`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
