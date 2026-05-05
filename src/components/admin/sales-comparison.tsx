"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
interface SalesComparisonChartProps {
  currentMonthName: string
  lastMonthName: string
  currentCumulative: (number | null)[]
  lastCumulative: number[]
}

function getChartComparisonDisplay(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return {
        accentClassName: "text-muted-foreground",
        deltaPrefix: "",
        label: "Sin base de comparación para el mismo día",
      }
    }

    return {
      accentClassName: "text-green-600",
      deltaPrefix: "+",
      label: "Sin base de comparación para el mismo día",
    }
  }

  const isAbove = current >= previous
  const diffPercent = ((current - previous) / previous) * 100

  return {
    accentClassName: isAbove ? "text-green-600" : "text-orange-600",
    deltaPrefix: isAbove ? "+" : "",
    label: `${isAbove ? "Arriba" : "Abajo"} un ${Math.abs(diffPercent).toFixed(1)}% vs mismo día mes anterior`,
  }
}

export function SalesComparisonChart({
  currentMonthName,
  lastMonthName,
  currentCumulative,
  lastCumulative,
}: SalesComparisonChartProps) {
  const currentData = currentCumulative
    .map((val, idx) => val !== null ? { val, idx } : null)
    .filter((item): item is { val: number; idx: number } => item !== null)
  const elapsedDays = currentData.length
  const visibleSteps = Math.max(7, elapsedDays, 2)
  const visibleCurrent = currentCumulative.slice(0, visibleSteps)
  const visibleLast = lastCumulative.slice(0, visibleSteps)

  // Find max value for scaling
  const maxVal = Math.max(
    ...visibleLast,
    ...(visibleCurrent.filter(v => v !== null) as number[]),
    1000 // min scale
  )

  const width = 1000
  const height = 300
  const padding = 40

  const getX = (index: number) => (index / (visibleSteps - 1)) * (width - padding * 2) + padding
  const getY = (value: number) => height - padding - (value / maxVal) * (height - padding * 2)

  // Draw paths
  const lastPath = visibleLast.map((val, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx)} ${getY(val)}`).join(" ")
  
  const visibleCurrentData = currentData.filter((item) => item.idx < visibleSteps)
  const currentPath = visibleCurrentData.map((item, idx) => `${idx === 0 ? "M" : "L"} ${getX(item.idx)} ${getY(item.val)}`).join(" ")
  const currentMarkers = visibleCurrentData.filter((item, idx, items) => {
    const previous = idx > 0 ? items[idx - 1].val : 0
    return item.val !== previous || idx === items.length - 1
  })

  // Compare today vs same day last month
  const todayIdx = elapsedDays - 1
  const todayVal = currentCumulative[todayIdx] || 0
  const lastMonthSameDayVal = lastCumulative[todayIdx] || 0
  const diff = todayVal - lastMonthSameDayVal
  const comparison = getChartComparisonDisplay(todayVal, lastMonthSameDayVal)

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
          <div className={`text-right ${comparison.accentClassName}`}>
            <p className="text-2xl font-bold">
              {comparison.deltaPrefix}
              {diff.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs font-medium">
              {comparison.label}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[340px] w-full relative">
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

            {/* Current month points with movement */}
            {currentMarkers.map((item) => (
              <g key={item.idx}>
                <circle
                  cx={getX(item.idx)}
                  cy={getY(item.val)}
                  r={item.idx === todayIdx ? 7 : 5}
                  fill="white"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                />
                <text
                  x={getX(item.idx)}
                  y={Math.max(14, getY(item.val) - 14)}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-semibold"
                >
                  D{item.idx + 1}
                </text>
                <text
                  x={getX(item.idx)}
                  y={Math.max(28, getY(item.val) - 2)}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {item.val.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    notation: "compact",
                    maximumFractionDigits: 1,
                  })}
                </text>
              </g>
            ))}

            {/* X-axis day labels for the visible window */}
            {Array.from({ length: visibleSteps }, (_, idx) => (
              <text
                key={idx}
                x={getX(idx)}
                y={height - padding + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {idx + 1}
              </text>
            ))}

            {/* Legends */}
            <g transform={`translate(${padding}, ${height - 10})`}>
              <circle r="4" fill="currentColor" fillOpacity="0.3" cx="0" cy="0" />
              <text x="10" y="4" className="text-[12px] fill-muted-foreground">{lastMonthName}</text>
              
              <circle r="4" fill="hsl(var(--primary))" cx="100" cy="0" />
              <text x="110" y="4" className="text-[12px] fill-muted-foreground">{currentMonthName}</text>
            </g>
          </svg>
          <div className="mt-2 text-xs text-muted-foreground">
            Mostrando días 1 al {visibleSteps} para distinguir el avance real de {currentMonthName}.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
