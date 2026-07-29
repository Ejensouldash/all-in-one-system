import React from "react"
import { Svg, Rect, Line, Path, Text as SvgText, G, Circle } from "@react-pdf/renderer"

/**
 * Vector chart primitives for the PDF report.
 *
 * These draw real PDF vector shapes rather than embedding a rasterised screenshot, so the output
 * stays sharp at any zoom and the surrounding text remains selectable and searchable.
 */

const AXIS = "#cbd5e1"
const GRID = "#e2e8f0"
const LABEL = "#64748b"

const nf = (n: number) => Math.round(n).toLocaleString("en-MY")

/** Rounds an axis maximum up to a friendly number so gridlines land on readable values. */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  const scaled = value / base
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return step * base
}

function yTicks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i)
}

// ---------------------------------------------------------------------------------------------
// Stacked / grouped column chart
// ---------------------------------------------------------------------------------------------

export type StackSeries = { key: string; label: string; color: string }

export function StackedBarChart({
  data,
  series,
  width = 515,
  height = 190,
  grouped = false,
}: {
  data: { label: string; values: Record<string, number> }[]
  series: StackSeries[]
  width?: number
  height?: number
  grouped?: boolean
}) {
  const padLeft = 46
  const padBottom = 22
  const padTop = 8
  const plotW = width - padLeft - 8
  const plotH = height - padBottom - padTop

  const totals = data.map(d =>
    grouped
      ? Math.max(...series.map(s => d.values[s.key] || 0), 0)
      : series.reduce((sum, s) => sum + (d.values[s.key] || 0), 0)
  )
  const max = niceMax(Math.max(...totals, 1))
  const ticks = yTicks(max)

  const slot = plotW / Math.max(data.length, 1)
  const barW = grouped
    ? Math.min(14, (slot * 0.7) / Math.max(series.length, 1))
    : Math.min(26, slot * 0.6)

  return (
    <Svg width={width} height={height}>
      {ticks.map((t, i) => {
        const y = padTop + plotH - (t / max) * plotH
        return (
          <G key={`g${i}`}>
            <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} strokeWidth={0.5} stroke={i === 0 ? AXIS : GRID} />
            <SvgText x={padLeft - 5} y={y + 3} style={{ fontSize: 6.5, fill: LABEL, textAlign: "right" }} textAnchor="end">
              {nf(t)}
            </SvgText>
          </G>
        )
      })}

      {data.map((d, i) => {
        const groupX = padLeft + slot * i
        if (grouped) {
          const totalW = barW * series.length + 2 * (series.length - 1)
          const startX = groupX + (slot - totalW) / 2
          return (
            <G key={`b${i}`}>
              {series.map((s, si) => {
                const v = d.values[s.key] || 0
                const h = (v / max) * plotH
                return (
                  <Rect
                    key={s.key}
                    x={startX + si * (barW + 2)}
                    y={padTop + plotH - h}
                    width={barW}
                    height={Math.max(h, v > 0 ? 0.8 : 0)}
                    fill={s.color}
                  />
                )
              })}
              <SvgText x={groupX + slot / 2} y={height - 7} style={{ fontSize: 6.5, fill: LABEL }} textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          )
        }

        let cursorY = padTop + plotH
        return (
          <G key={`b${i}`}>
            {series.map(s => {
              const v = d.values[s.key] || 0
              if (v <= 0) return null
              const h = (v / max) * plotH
              cursorY -= h
              return <Rect key={s.key} x={groupX + (slot - barW) / 2} y={cursorY} width={barW} height={h} fill={s.color} />
            })}
            <SvgText x={groupX + slot / 2} y={height - 7} style={{ fontSize: 6.5, fill: LABEL }} textAnchor="middle">
              {d.label}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

// ---------------------------------------------------------------------------------------------
// Horizontal bars — used for downtime by section
// ---------------------------------------------------------------------------------------------

export function HorizontalBars({
  data,
  width = 515,
  rowHeight = 15,
  color = "#f97316",
  valueSuffix = "",
  labelWidth = 108,
}: {
  data: { label: string; value: number }[]
  width?: number
  rowHeight?: number
  color?: string
  valueSuffix?: string
  labelWidth?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  const valueW = 46
  const trackW = width - labelWidth - valueW
  const height = data.length * rowHeight + 4

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const y = i * rowHeight + 2
        const w = (d.value / max) * trackW
        return (
          <G key={i}>
            <SvgText x={0} y={y + rowHeight / 2 + 1} style={{ fontSize: 7, fill: "#334155" }}>
              {d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label}
            </SvgText>
            <Rect x={labelWidth} y={y + 2} width={trackW} height={rowHeight - 7} fill="#f1f5f9" />
            <Rect x={labelWidth} y={y + 2} width={Math.max(w, 0.8)} height={rowHeight - 7} fill={color} />
            <SvgText
              x={width}
              y={y + rowHeight / 2 + 1}
              style={{ fontSize: 7, fill: "#0f172a" }}
              textAnchor="end"
            >
              {`${nf(d.value)}${valueSuffix}`}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

// ---------------------------------------------------------------------------------------------
// Pareto: columns plus a cumulative line
// ---------------------------------------------------------------------------------------------

export function ParetoChart({
  data,
  width = 515,
  height = 180,
  colors,
}: {
  data: { name: string; value: number; cumulative: number }[]
  width?: number
  height?: number
  colors: string[]
}) {
  const padLeft = 46
  const padRight = 30
  const padBottom = 22
  const padTop = 8
  const plotW = width - padLeft - padRight
  const plotH = height - padBottom - padTop

  const max = niceMax(Math.max(...data.map(d => d.value), 1))
  const ticks = yTicks(max)
  const slot = plotW / Math.max(data.length, 1)
  const barW = Math.min(30, slot * 0.55)

  const points = data.map((d, i) => ({
    x: padLeft + slot * i + slot / 2,
    y: padTop + plotH - (d.cumulative / 100) * plotH,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")

  return (
    <Svg width={width} height={height}>
      {ticks.map((t, i) => {
        const y = padTop + plotH - (t / max) * plotH
        return (
          <G key={`g${i}`}>
            <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} strokeWidth={0.5} stroke={i === 0 ? AXIS : GRID} />
            <SvgText x={padLeft - 5} y={y + 3} style={{ fontSize: 6.5, fill: LABEL }} textAnchor="end">
              {nf(t)}
            </SvgText>
          </G>
        )
      })}

      {[0, 50, 100].map(p => (
        <SvgText
          key={`r${p}`}
          x={padLeft + plotW + 5}
          y={padTop + plotH - (p / 100) * plotH + 3}
          style={{ fontSize: 6.5, fill: LABEL }}
        >
          {`${p}%`}
        </SvgText>
      ))}

      {data.map((d, i) => {
        const h = (d.value / max) * plotH
        return (
          <G key={`b${i}`}>
            <Rect
              x={padLeft + slot * i + (slot - barW) / 2}
              y={padTop + plotH - h}
              width={barW}
              height={Math.max(h, 0.8)}
              fill={colors[i % colors.length]}
            />
            <SvgText x={padLeft + slot * i + slot / 2} y={height - 7} style={{ fontSize: 6, fill: LABEL }} textAnchor="middle">
              {d.name.length > 13 ? `${d.name.slice(0, 12)}…` : d.name}
            </SvgText>
          </G>
        )
      })}

      <Path d={linePath} stroke="#0f172a" strokeWidth={1.2} fill="none" />
      {points.map((p, i) => (
        <Circle key={`p${i}`} cx={p.x} cy={p.y} r={1.8} fill="#0f172a" />
      ))}
    </Svg>
  )
}

// ---------------------------------------------------------------------------------------------
// Area/line trend
// ---------------------------------------------------------------------------------------------

export function TrendChart({
  data,
  width = 515,
  height = 160,
  color = "#4f46e5",
}: {
  data: { label: string; value: number }[]
  width?: number
  height?: number
  color?: string
}) {
  const padLeft = 46
  const padBottom = 22
  const padTop = 8
  const plotW = width - padLeft - 8
  const plotH = height - padBottom - padTop

  const max = niceMax(Math.max(...data.map(d => d.value), 1))
  const ticks = yTicks(max)
  const step = data.length > 1 ? plotW / (data.length - 1) : 0

  const pts = data.map((d, i) => ({
    x: padLeft + (data.length > 1 ? step * i : plotW / 2),
    y: padTop + plotH - (d.value / max) * plotH,
  }))
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = `${line} L${pts[pts.length - 1]?.x.toFixed(1)},${padTop + plotH} L${pts[0]?.x.toFixed(1)},${padTop + plotH} Z`

  // Keep the x-axis readable when the range is long.
  const labelEvery = Math.ceil(data.length / 14)

  return (
    <Svg width={width} height={height}>
      {ticks.map((t, i) => {
        const y = padTop + plotH - (t / max) * plotH
        return (
          <G key={`g${i}`}>
            <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} strokeWidth={0.5} stroke={i === 0 ? AXIS : GRID} />
            <SvgText x={padLeft - 5} y={y + 3} style={{ fontSize: 6.5, fill: LABEL }} textAnchor="end">
              {nf(t)}
            </SvgText>
          </G>
        )
      })}

      {pts.length > 1 && <Path d={area} fill={color} fillOpacity={0.12} />}
      {pts.length > 1 && <Path d={line} stroke={color} strokeWidth={1.4} fill="none" />}
      {pts.map((p, i) => (
        <Circle key={`c${i}`} cx={p.x} cy={p.y} r={1.6} fill={color} />
      ))}

      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <SvgText key={`x${i}`} x={pts[i].x} y={height - 7} style={{ fontSize: 6, fill: LABEL }} textAnchor="middle">
            {d.label}
          </SvgText>
        ) : null
      )}
    </Svg>
  )
}

// ---------------------------------------------------------------------------------------------
// Donut — SKU share
// ---------------------------------------------------------------------------------------------

export function DonutChart({
  data,
  size = 130,
  thickness = 26,
}: {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 2
  const rInner = rOuter - thickness

  if (total <= 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} stroke="#e2e8f0" strokeWidth={thickness} fill="none" />
      </Svg>
    )
  }

  let angle = -Math.PI / 2
  const slices = data
    .filter(d => d.value > 0)
    .map(d => {
      const sweep = (d.value / total) * Math.PI * 2
      const start = angle
      const end = angle + sweep
      angle = end

      const x1 = cx + rOuter * Math.cos(start)
      const y1 = cy + rOuter * Math.sin(start)
      const x2 = cx + rOuter * Math.cos(end)
      const y2 = cy + rOuter * Math.sin(end)
      const x3 = cx + rInner * Math.cos(end)
      const y3 = cy + rInner * Math.sin(end)
      const x4 = cx + rInner * Math.cos(start)
      const y4 = cy + rInner * Math.sin(start)
      const large = sweep > Math.PI ? 1 : 0

      return {
        color: d.color,
        d: [
          `M${x1.toFixed(2)},${y1.toFixed(2)}`,
          `A${rOuter},${rOuter} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
          `L${x3.toFixed(2)},${y3.toFixed(2)}`,
          `A${rInner},${rInner} 0 ${large} 0 ${x4.toFixed(2)},${y4.toFixed(2)}`,
          "Z",
        ].join(" "),
      }
    })

  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => (
        <Path key={i} d={s.d} fill={s.color} />
      ))}
    </Svg>
  )
}

// ---------------------------------------------------------------------------------------------
// Coverage strip — one cell per calendar day
// ---------------------------------------------------------------------------------------------

export function CoverageStrip({
  data,
  width = 515,
}: {
  data: { date: string; isWorkingDay: boolean; expected: number; submitted: number }[]
  width?: number
}) {
  const perRow = 14
  const cell = Math.min(34, width / perRow - 3)
  const gap = 3
  const rows = Math.ceil(data.length / perRow)
  const height = rows * (cell + gap + 9)

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const row = Math.floor(i / perRow)
        const col = i % perRow
        const x = col * (cell + gap)
        const y = row * (cell + gap + 9)

        const fill = !d.isWorkingDay
          ? "#f1f5f9"
          : d.submitted === 0
            ? "#fecaca"
            : d.submitted < d.expected
              ? "#fde68a"
              : "#a7f3d0"
        const stroke = !d.isWorkingDay
          ? "#e2e8f0"
          : d.submitted === 0
            ? "#f87171"
            : d.submitted < d.expected
              ? "#fbbf24"
              : "#34d399"

        return (
          <G key={i}>
            <Rect x={x} y={y} width={cell} height={cell} fill={fill} stroke={stroke} strokeWidth={0.6} rx={2} />
            <SvgText x={x + cell / 2} y={y + cell / 2 - 1} style={{ fontSize: 7, fill: "#0f172a" }} textAnchor="middle">
              {d.date.split("-")[2]}
            </SvgText>
            <SvgText x={x + cell / 2} y={y + cell / 2 + 7} style={{ fontSize: 5.5, fill: "#475569" }} textAnchor="middle">
              {d.isWorkingDay ? `${d.submitted}/${d.expected}` : "-"}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}
