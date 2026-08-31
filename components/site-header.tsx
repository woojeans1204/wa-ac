import { Input } from "@/components/ui/input"
import { Code2Icon, SearchIcon } from "lucide-react"

export function SiteHeader({ user }: { user: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-4 px-4 lg:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Code2Icon className="size-4" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-none">PS Matchlog</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Contest intelligence</div>
          </div>
        </div>
        <div className="relative ml-1 w-full max-w-md sm:ml-4">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={user} readOnly aria-label="Player search" className="h-9 bg-muted/50 pl-9 shadow-none" />
        </div>
        <span className="ml-auto hidden text-xs text-muted-foreground md:block">Synced from AtCoder history</span>
      </div>
    </header>
  )
}
