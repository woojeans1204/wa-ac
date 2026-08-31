import type { Metadata } from "next"
import history from "@/app/data/history.json"
import { ShadcnDashboard } from "@/components/shadcn-dashboard/dashboard"
import type { History } from "@/components/ps-types"

export const metadata: Metadata = {
  title: "SSS_PrizeHunter · shadcn dashboard",
  description: "PS match history connected to the official shadcn dashboard-01 block.",
}

export default function ShadcnPage() {
  return <ShadcnDashboard history={history as History} />
}
