import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function ShadcnSiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <h1 className="text-base font-medium">PS Matchlog</h1>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a href="/shadcn">AtCoder</a>
          </Button>
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a href="/codeforces">Codeforces</a>
          </Button>
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a href="/" className="dark:text-foreground">Original view</a>
          </Button>
        </div>
      </div>
    </header>
  )
}
