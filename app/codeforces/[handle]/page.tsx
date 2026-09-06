import type { Metadata } from "next"
import { CodeforcesSearch } from "@/components/codeforces/codeforces-search"

export const metadata: Metadata = {
  title: "Codeforces player · WA:AC",
  description: "Codeforces contest history, upsolve queue, rating, and solve coverage.",
}

export default async function CodeforcesHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  return <CodeforcesSearch initialHandle={handle} />
}
