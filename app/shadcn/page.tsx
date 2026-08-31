import type { Metadata } from "next"
import history from "@/app/data/history.json"
import { AtCoderSearch } from "@/components/atcoder/atcoder-search"
import type { History } from "@/components/ps-types"

export const metadata: Metadata = {
  title: "AtCoder player search · PS Matchlog",
  description: "Search an AtCoder username and turn public submissions into contest match history.",
}

export default function ShadcnPage() {
  return <AtCoderSearch initialHistory={history as History} />
}
