"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3Icon, ChevronDownIcon, Clock3Icon, SearchIcon, ShieldIcon, SwordsIcon, TrophyIcon } from "lucide-react"

type Match = {
  id: number
  result: "Victory" | "Defeat"
  queue: string
  ago: string
  duration: string
  champion: string
  level: number
  kda: string
  ratio: string
  cs: string
  participation: string
  score: number
  items: string[]
}

const matches: Match[] = [
  { id: 1, result: "Victory", queue: "Ranked Solo/Duo", ago: "15 hours ago", duration: "25m 35s", champion: "Astra", level: 15, kda: "8 / 2 / 9", ratio: "8.50:1 KDA", cs: "203 (7.9)", participation: "P/Kill 57%", score: 8.7, items: ["#7357e8", "#d9a441", "#4b87d9", "#8257b9", "#5e738f", "#ef5350"] },
  { id: 2, result: "Defeat", queue: "Ranked Solo/Duo", ago: "17 hours ago", duration: "27m 56s", champion: "Orion", level: 17, kda: "4 / 7 / 6", ratio: "1.43:1 KDA", cs: "184 (6.6)", participation: "P/Kill 49%", score: 5.1, items: ["#c65d35", "#7d63bf", "#d6aa45", "#5698b7", "#596572", "#e04c5f"] },
  { id: 3, result: "Victory", queue: "Ranked Flex", ago: "21 hours ago", duration: "26m 17s", champion: "Nox", level: 16, kda: "12 / 3 / 7", ratio: "6.33:1 KDA", cs: "228 (8.7)", participation: "P/Kill 63%", score: 9.3, items: ["#5a6fc6", "#64469b", "#df9a36", "#9a5366", "#4e89af", "#d7553d"] },
  { id: 4, result: "Defeat", queue: "Normal", ago: "1 day ago", duration: "31m 07s", champion: "Lyra", level: 18, kda: "3 / 9 / 12", ratio: "1.67:1 KDA", cs: "194 (6.2)", participation: "P/Kill 33%", score: 4.6, items: ["#ca513c", "#d8893a", "#5b72a8", "#76488e", "#b1a24a", "#5f8794"] },
]

const nav = ["Summary", "Style", "Champions", "Highlights", "Mastery", "Live game"]

export function OpggMockup() {
  const [activeNav, setActiveNav] = React.useState("Summary")
  const [expanded, setExpanded] = React.useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#ebecef] text-[#202d37]">
      <header>
        <div className="bg-[#28344e] text-white">
          <div className="mx-auto flex h-12 max-w-[1080px] items-center gap-6 px-4">
            <div className="flex items-center gap-2 text-lg font-black tracking-tight"><SwordsIcon className="size-5 text-[#70a5ff]" /> GG.LAB</div>
            <nav className="hidden items-center gap-5 text-xs text-[#c3cbdc] md:flex">
              <span className="font-semibold text-white">League of Legends</span><span>Teamfight Tactics</span><span>Valorant</span><span>Leaderboards</span>
            </nav>
            <div className="relative ml-auto hidden w-64 sm:block">
              <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#79869e]" />
              <Input aria-label="Search player" placeholder="Search a player + #tag" className="h-8 border-0 bg-white pl-9 text-xs text-gray-900" />
            </div>
          </div>
        </div>
        <div className="bg-[#5383e8] text-white">
          <div className="mx-auto flex h-10 max-w-[1080px] items-center gap-6 overflow-x-auto px-4 text-xs">
            <span className="border-b-2 border-white py-3 font-semibold">Home</span><span>Champions</span><span>Game modes</span><span>Stats</span><span>Rankings</span><span>Pro spectate</span>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b bg-[#f7f7f9]">
          <div className="mx-auto flex max-w-[1080px] flex-col gap-5 px-4 py-7 md:flex-row md:items-center">
            <div className="relative size-[100px] shrink-0 rounded-[20px] bg-[radial-gradient(circle_at_35%_30%,#8de8ff_0%,#3778d6_38%,#1b2c52_70%,#10182d_100%)] shadow-inner">
              <ShieldIcon className="absolute inset-0 m-auto size-12 text-white/90" />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#202d37] px-2 py-0.5 text-[11px] text-white">118</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">범고래1204 <span className="font-normal text-[#758094]">#KR1</span></h1><Badge variant="outline" className="bg-white">KR</Badge></div>
              <p className="mt-1 text-xs text-[#758094]">Ladder Rank <span className="font-semibold text-[#5383e8]">2,173,483</span> · top 73.78%</p>
              <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" className="bg-[#5383e8] hover:bg-[#416fc5]">Update</Button><Button size="sm" variant="outline" className="bg-white text-[#5383e8]">Tier graph</Button></div>
              <p className="mt-2 text-[11px] text-[#98a0ad]">Last updated 19 hours ago</p>
            </div>
            <div className="hidden h-[150px] w-[320px] items-center justify-center rounded bg-[#dfe2e8] text-xs font-semibold text-[#9aa1ad] lg:flex">ADVERTISEMENT</div>
          </div>
        </section>

        <div className="border-b bg-white">
          <div className="mx-auto max-w-[1080px] px-4">
            <Tabs value={activeNav} onValueChange={setActiveNav}>
              <TabsList variant="line" className="h-14 w-full justify-start gap-4 overflow-x-auto rounded-none bg-transparent">
                {nav.map((item) => <TabsTrigger key={item} value={item} className="px-3 text-xs">{item}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="mx-auto max-w-[1080px] px-4 py-3">
          <div className="mb-3 flex h-24 items-center justify-center rounded bg-[#dfe2e8] text-[11px] font-semibold text-[#9aa1ad]">ADVERTISEMENT</div>

          <div className="mb-2 flex items-center gap-1 rounded bg-white p-1.5">
            {['All', 'Ranked Solo/Duo', 'Ranked Flex', 'Normal'].map((item, index) => <Button key={item} size="sm" variant={index === 0 ? "secondary" : "ghost"} className="h-8 text-xs">{item}</Button>)}
          </div>

          <div className="grid gap-2 lg:grid-cols-[300px_1fr]">
            <aside className="space-y-2">
              <Card className="gap-0 rounded py-0 shadow-none">
                <CardHeader className="border-b px-3 py-2"><CardTitle className="text-xs">Ranked Solo/Duo</CardTitle></CardHeader>
                <CardContent className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex size-20 items-center justify-center rounded-full bg-[radial-gradient(circle,#6078a9,#2d3c61_65%,#1d2944)]"><TrophyIcon className="size-10 text-[#cbd7ef]" /></div>
                    <div><div className="text-xl font-bold">Silver 3</div><div className="text-xs text-[#758094]">40 LP</div><div className="mt-2 text-xs">8W 7L · 53%</div></div>
                  </div>
                  <div className="mt-4 border-t pt-3 text-xs text-[#758094]"><div className="flex justify-between"><span>Season peak</span><strong className="text-[#202d37]">Gold 4</strong></div><div className="mt-2 flex justify-between"><span>Top role</span><strong className="text-[#202d37]">Mid 62%</strong></div></div>
                </CardContent>
              </Card>

              <Card className="gap-0 rounded py-0 shadow-none">
                <CardHeader className="border-b px-3 py-2"><CardTitle className="text-xs">Recent champions</CardTitle></CardHeader>
                <CardContent className="space-y-3 p-3">
                  {[["Astra",68,"8W 4L"],["Orion",55,"6W 5L"],["Lyra",48,"4W 5L"]].map(([name,rate,record], index) => (
                    <div key={String(name)} className="grid grid-cols-[36px_1fr_auto] items-center gap-2">
                      <div className={`flex size-9 items-center justify-center rounded-full text-xs font-bold text-white ${index === 0 ? "bg-[#6d5bc5]" : index === 1 ? "bg-[#3d7f9f]" : "bg-[#a85272]"}`}>{String(name).slice(0,1)}</div>
                      <div><div className="text-xs font-semibold">{name}</div><div className="text-[10px] text-[#758094]">{record}</div></div><strong className="text-xs text-[#5383e8]">{rate}%</strong>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>

            <section className="min-w-0 space-y-2">
              <Card className="gap-0 rounded py-0 shadow-none">
                <CardContent className="grid gap-4 p-3 sm:grid-cols-[120px_1fr_150px] sm:items-center">
                  <div className="flex items-center gap-3 sm:block sm:text-center"><div className="relative size-20 rounded-full bg-[conic-gradient(#5383e8_0_68%,#e84057_68%_100%)] p-2"><div className="flex size-full items-center justify-center rounded-full bg-white text-lg font-bold text-[#5383e8]">68%</div></div><div className="text-xs"><strong>20G 13W 7L</strong><div className="text-[#758094]">Recent win rate</div></div></div>
                  <div><div className="text-xs text-[#758094]">Average KDA</div><div className="mt-1 text-xl font-bold">2.46 : 1</div><div className="mt-2 flex gap-4 text-xs"><span><b className="text-[#5383e8]">5.0</b> / <b className="text-[#e84057]">6.3</b> / 10.6</span><span>P/Kill 45%</span></div></div>
                  <div><div className="mb-2 text-xs text-[#758094]">Preferred role</div><div className="flex h-16 items-end gap-3">{[26,55,18,32,70].map((height,index)=><div key={index} className="flex-1 rounded-t bg-[#d9deea]"><div className="mt-auto rounded-t bg-[#5383e8]" style={{height}} /></div>)}</div></div>
                </CardContent>
              </Card>

              {matches.map((match) => <MatchRow key={match.id} match={match} expanded={expanded === match.id} onToggle={() => setExpanded(expanded === match.id ? null : match.id)} />)}
              <Button variant="secondary" className="w-full rounded text-xs">Show more</Button>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

function MatchRow({ match, expanded, onToggle }: { match: Match; expanded: boolean; onToggle: () => void }) {
  const win = match.result === "Victory"
  return (
    <Card className={`gap-0 overflow-hidden rounded border-l-[6px] py-0 shadow-none ${win ? "border-l-[#5383e8] bg-[#ecf2ff]" : "border-l-[#e84057] bg-[#fff1f3]"}`}>
      <button type="button" onClick={onToggle} className="grid w-full grid-cols-[92px_58px_1fr_auto] items-center gap-3 p-3 text-left sm:grid-cols-[105px_62px_150px_1fr_52px]">
        <div className="text-[11px]"><strong className={win ? "text-[#5383e8]" : "text-[#e84057]"}>{match.result}</strong><div className="mt-1 text-[#758094]">{match.queue}</div><div className="mt-2 flex items-center gap-1 text-[#758094]"><Clock3Icon className="size-3" />{match.duration}</div></div>
        <div className={`flex size-12 items-center justify-center rounded-full text-sm font-bold text-white ${win ? "bg-[#5767aa]" : "bg-[#a64f6a]"}`}>{match.champion.slice(0,1)}<span className="ml-0.5 text-[9px] opacity-70">{match.level}</span></div>
        <div><div className="font-semibold">{match.kda}</div><div className="text-[11px] font-semibold text-[#758094]">{match.ratio}</div><div className="mt-1 text-[10px] text-[#758094] sm:hidden">{match.cs} · {match.participation}</div></div>
        <div className="hidden min-w-0 sm:block"><div className="flex gap-1">{match.items.map((color,index)=><span key={index} className="size-7 rounded" style={{backgroundColor:color}} />)}</div><div className="mt-2 flex gap-4 text-[10px] text-[#758094]"><span>CS {match.cs}</span><span>{match.participation}</span></div></div>
        <div className="text-center"><div className={`mx-auto flex size-8 items-center justify-center rounded-full text-xs font-bold text-white ${match.score >= 8 ? "bg-[#f2a900]" : "bg-[#758094]"}`}>{match.score}</div><ChevronDownIcon className={`mx-auto mt-1 size-4 text-[#758094] transition-transform ${expanded ? "rotate-180" : ""}`} /></div>
      </button>
      {expanded && (
        <div className="border-t border-black/5 bg-white/70 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailStat label="Laning" value={win ? "57 : 43" : "46 : 54"} progress={win ? 57 : 46} />
            <DetailStat label="Damage share" value={win ? "31%" : "22%"} progress={win ? 72 : 48} />
            <DetailStat label="Vision score" value={win ? "28" : "19"} progress={win ? 65 : 44} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-[11px] text-[#758094]"><span>Inline match detail · timeline and team comparison preview</span><Button variant="ghost" size="sm" className="h-7 text-[11px]"><BarChart3Icon /> Full analysis</Button></div>
        </div>
      )}
    </Card>
  )
}

function DetailStat({ label, value, progress }: { label: string; value: string; progress: number }) {
  return <div className="rounded border bg-white p-3"><div className="flex justify-between text-xs"><span className="text-[#758094]">{label}</span><strong>{value}</strong></div><Progress value={progress} className="mt-2 h-1.5" /></div>
}
