import { Filter, Layers, Settings, Star, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function DashboardSidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Filters Section */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Layers className="mr-2 h-4 w-4" />
              All Stocks
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Star className="mr-2 h-4 w-4" />
              Watchlist
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Top Gainers
            </Button>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Market Cap */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">Market Cap</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              <span>Large Cap (&gt;$10B)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              <span>Mid Cap ($2B-$10B)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              <span>Small Cap (&lt;$2B)</span>
            </label>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Sector */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">Sector</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              <span>Technology</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              <span>Healthcare</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              <span>Finance</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              <span>Energy</span>
            </label>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Settings */}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </aside>
  )
}
