import type { Metadata } from "next"
import history from "./data/history.json"
import { DashboardShell } from "@/components/dashboard-shell"
import type { History } from "@/components/ps-types"

export const metadata: Metadata = {
  title: "SSS_PrizeHunter · PS Matchlog",
  description: "Competitive programming match history and training frontier.",
};

export default function Home() {
  const data = history as History
  return <DashboardShell history={data} />
}
