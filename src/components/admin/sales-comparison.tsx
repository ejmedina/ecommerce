"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
interface SalesComparisonChartProps {
  currentMonthName: string
  lastMonthName: string
  currentCumulative: (number | null)[]
  lastCumulative: number[]
}

export function SalesComparisonChart({
  currentMonthName,
  lastMonthName,
  currentCumulative,
  lastCumulative,
}: SalesComparisonChartProps) {
  // Find max value for scaling
  const maxVal = Math.max(
    ...lastCumulative,
    ...(currentCumulative.filter(v => v !== null) as number[]),
    1000 // min scale
  )

  const steps = 30
  const width = 1000
  const height = 300
  const padding = 40

  const getX = (index: number) => (index / (steps - 1)) * (width - padding * 2) + padding
  const getY = (value: number) => height - padding - (value / maxVal) * (height - padding * 2)

  // Draw paths
  const lastPath = lastCumulative.map((val, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(val)}`).join(" ")
  
  const filteredCurrent = currentCumulative.map((val, idx) => val !== null ? { val, idx } : null).filter(v => v !== null)
  const currentPath = filteredCurrent.map((item, idx) => `${idx === 0 ? "M" : "L"} ${getX(item!.idx)} ${getY(item!.val)}`).join(" ")

  // Compare today vs same day last month
  const todayIdx = currentCumulative.filter(v => v !== null).length - 1
  const todayVal = currentCumulative[todayIdx] || 0
  const lastMonthSameDayVal = lastCumulative[todayIdx] || 0
  const isAbove = todayVal >= lastMonthSameDayVal
  const diff = todayVal - lastMonthSameDayVal
  const diffPercent = lastMonthSameDayVal > 0 ? (diff / lastMonthSameDayVal) * 100 : 0

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Progreso de Ventas</CardTitle>
            <CardDescription>
              Comparativa acumulada diaria: {currentMonthName} vs {lastMonthName}
            </CardDescription>
          </div>
          <div className={`text-right ${isAbove ? "text-green-600" : "text-orange-600"}`}>
            <p className="text-2xl font-bold">
              {isAbove ? "+" : ""}{diff.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs font-medium">
              {isAbove ? "Arriba" : "Abajo"} un {Math.abs(diffPercent).toFixed(1)}% vs mismo día mes anterior
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line
                key={p}
                x1={padding}
                y1={getY(maxVal * p)}
                x2={width - padding}
                y2={getY(maxVal * p)}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="1"
              />
            ))}

            {/* Last Month Line */}
            <path
              d={lastPath}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            
            {/* Current Month Line */}
            <path
              d={currentPath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points for last recorded day */}
            {filteredCurrent.length > 0 && (
              <circle
                cx={getX(todayIdx)}
                cy={getY(todayVal)}
                r="6"
                fill="hsl(var(--primary))"
                className="animate-pulse"
              />
            )}

            {/* Legends */}
            <g transform={`translate(${padding}, ${height - 10})`}>
              <circle r="4" fill="currentColor" fillOpacity="0.3" cx="0" cy="0" />
              <text x="10" y="4" className="text-[12px] fill-muted-foreground">{lastMonthName}</text>
              
              <circle r="4" fill="hsl(var(--primary))" cx="100" cy="0" />
              <text x="110" y="4" className="text-[12px] fill-muted-foreground">{currentMonthName}</text>
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
