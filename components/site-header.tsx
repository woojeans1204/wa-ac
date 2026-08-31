import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SearchIcon } from "lucide-react"

export function SiteHeader({ user }: { user: string }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center border-b bg-background">
      <div className="flex w-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
        <div className="relative w-full max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={user} readOnly aria-label="Player search" className="h-9 bg-muted/50 pl-9 shadow-none" />
        </div>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">Synced from AtCoder history</span>
      </div>
    </header>
  )
}
