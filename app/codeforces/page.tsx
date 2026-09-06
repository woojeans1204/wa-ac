import type { Metadata } from "next"
import { CodeforcesSearch } from "@/components/codeforces/codeforces-search"

export const metadata: Metadata = {
  title: "Codeforces player search · WA:AC",
  description: "Search a Codeforces handle and turn public submissions into contest match history.",
}

export default function CodeforcesPage() {
  return <CodeforcesSearch />
}
