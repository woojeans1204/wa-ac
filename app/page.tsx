import type { Metadata } from "next";
import history from "./data/history.json";
import { TrackerDashboard } from "./tracker-dashboard";

export const metadata: Metadata = {
  title: "SSS_PrizeHunter · PS Matchlog",
  description: "Competitive programming match history and training frontier.",
};

export default function Home() {
  return <TrackerDashboard history={history} />;
}
