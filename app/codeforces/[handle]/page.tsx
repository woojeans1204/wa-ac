import type { Metadata } from "next"
import { CodeforcesSearch } from "@/components/codeforces/codeforces-search"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const canonicalPath = `/codeforces/${encodeURIComponent(handle)}`

  return {
    title: `${handle} · Codeforces player · WA:AC`,
    description: `${handle}'s Codeforces contest history, upsolve queue, rating, and solve coverage.`,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      url: canonicalPath,
      title: `${handle} · Codeforces player · WA:AC`,
      description: `${handle}'s Codeforces contest history, upsolve queue, rating, and solve coverage.`,
    },
  }
}

export default async function CodeforcesHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  return <CodeforcesSearch initialHandle={handle} />
}
