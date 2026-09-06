const DEFAULT_SITE_URL = "https://wa-ac.awj1204.workers.dev"

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "")

