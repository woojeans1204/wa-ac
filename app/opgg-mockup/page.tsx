import type { Metadata } from "next"
import { OpggMockup } from "@/components/opgg-mockup"

export const metadata: Metadata = {
  title: "Match profile layout study",
  description: "An independent match-history interface mockup inspired by dense esports profile layouts.",
}

export default function OpggMockupPage() {
  return <OpggMockup />
}
