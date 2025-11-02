"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp, TrendingUp, Calendar } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useState } from "react"

const financialMetrics = [
  { metric: "P/E Ratio", value: 85, fullMark: 100, description: "Price to Earnings" },
  { metric: "Revenue Growth", value: 92, fullMark: 100, description: "YoY Revenue %" },
  { metric: "Profit Margin", value: 78, fullMark: 100, description: "Net Margin %" },
  { metric: "Debt/Equity", value: 65, fullMark: 100, description: "Financial Leverage" },
  { metric: "ROE", value: 88, fullMark: 100, description: "Return on Equity" },
  { metric: "Market Share", value: 73, fullMark: 100, description: "Industry Position" },
]

const stockData = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.45,
    change: 2.34,
    changePercent: 1.33,
    volume: "52.3M",
    marketCap: "2.8T",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 412.78,
    change: -1.23,
    changePercent: -0.3,
    volume: "28.1M",
    marketCap: "3.1T",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 142.56,
    change: 3.45,
    changePercent: 2.48,
    volume: "31.2M",
    marketCap: "1.8T",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 178.23,
    change: 5.67,
    changePercent: 3.28,
    volume: "45.6M",
    marketCap: "1.9T",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 875.34,
    change: 12.45,
    changePercent: 1.44,
    volume: "67.8M",
    marketCap: "2.2T",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 234.56,
    change: -4.32,
    changePercent: -1.81,
    volume: "89.4M",
    marketCap: "745B",
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    price: 487.23,
    change: 8.91,
    changePercent: 1.86,
    volume: "23.5M",
    marketCap: "1.2T",
  },
]

export function DashboardContent() {
  const [date, setDate] = useState<Date>(new Date())

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Financial Metrics Analysis</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Calendar className="h-4 w-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Performance Radar</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Multi-dimensional analysis of key financial indicators showing overall company health and market
                  position across six critical metrics.
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={financialMetrics}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Metric Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Metric</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-right text-muted-foreground">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialMetrics.map((item) => (
                      <TableRow key={item.metric} className="border-border hover:bg-secondary/50">
                        <TableCell className="font-semibold text-foreground">{item.metric}</TableCell>
                        <TableCell className="text-muted-foreground">{item.description}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={item.value >= 80 ? "default" : item.value >= 60 ? "secondary" : "outline"}
                            className={item.value >= 80 ? "bg-accent text-accent-foreground" : ""}
                          >
                            {item.value}/100
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Stock Screener</h2>
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              <TrendingUp className="mr-1 h-3 w-3" />
              {stockData.length} Results
            </Badge>
          </div>

          <Card className="bg-card border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Symbol</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-right text-muted-foreground">Price</TableHead>
                  <TableHead className="text-right text-muted-foreground">Change</TableHead>
                  <TableHead className="text-right text-muted-foreground">Volume</TableHead>
                  <TableHead className="text-right text-muted-foreground">Market Cap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockData.map((stock) => (
                  <TableRow key={stock.symbol} className="border-border hover:bg-secondary/50 cursor-pointer">
                    <TableCell className="font-mono font-semibold text-foreground">{stock.symbol}</TableCell>
                    <TableCell className="text-muted-foreground">{stock.name}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">${stock.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {stock.change > 0 ? (
                          <ArrowUp className="h-4 w-4 text-accent" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={stock.change > 0 ? "text-accent" : "text-destructive"}>
                          {stock.change > 0 ? "+" : ""}
                          {stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{stock.volume}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">${stock.marketCap}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </main>
  )
}
