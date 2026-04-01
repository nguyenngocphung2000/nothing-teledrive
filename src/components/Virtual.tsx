import { useEffect, useMemo, useRef, useState } from 'react'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function useSize(elRef: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({ width: r.width, height: r.height })
    return () => ro.disconnect()
  }, [elRef])
  return size
}

export function VirtualGrid<T>({
  items,
  minItemWidth,
  itemHeight,
  gap = 16,
  overscanRows = 2,
  renderItem,
}: {
  items: T[]
  minItemWidth: number
  itemHeight: number
  gap?: number
  overscanRows?: number
  renderItem: (item: T, idx: number) => React.ReactNode
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const { width: viewportW, height: viewportH } = useSize(viewportRef)
  const [scrollTop, setScrollTop] = useState(0)

  const cols = useMemo(() => {
    const w = viewportW
    if (!w) return 1
    // Fit as many as possible based on a minimum width.
    const c = Math.floor((w + gap) / (minItemWidth + gap))
    return Math.max(1, c)
  }, [viewportW, minItemWidth, gap])

  const rowCount = Math.ceil(items.length / cols)
  const rowStride = itemHeight + gap
  const totalHeight = Math.max(0, rowCount * rowStride - gap)

  const { startRow, endRow } = useMemo(() => {
    const top = scrollTop
    const start = Math.floor(top / rowStride)
    const visible = viewportH ? Math.ceil(viewportH / rowStride) : 1
    const from = clamp(start - overscanRows, 0, Math.max(0, rowCount - 1))
    const to = clamp(start + visible + overscanRows, 0, Math.max(0, rowCount - 1))
    return { startRow: from, endRow: to }
  }, [scrollTop, rowStride, viewportH, overscanRows, rowCount])

  const slice = useMemo(() => {
    if (items.length === 0) return []
    const startIdx = startRow * cols
    const endIdx = Math.min(items.length, (endRow + 1) * cols)
    return items.slice(startIdx, endIdx).map((item, i) => ({
      item,
      idx: startIdx + i,
    }))
  }, [items, startRow, endRow, cols])

  return (
    <div
      ref={viewportRef}
      className="relative h-full overflow-auto"
      onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
    >
      <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
        {slice.map(({ item, idx }) => {
          const row = Math.floor(idx / cols)
          const col = idx % cols
          const top = row * rowStride
          const leftPct = cols > 0 ? (col / cols) * 100 : 0
          const widthPct = cols > 0 ? 100 / cols : 100
          return (
            <div
              key={idx}
              className="absolute"
              style={{
                top,
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                paddingRight: col === cols - 1 ? 0 : gap,
              }}
            >
              <div style={{ height: itemHeight }}>{renderItem(item, idx)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function VirtualList<T>({
  items,
  rowHeight,
  overscan = 8,
  renderRow,
}: {
  items: T[]
  rowHeight: number
  overscan?: number
  renderRow: (item: T, idx: number) => React.ReactNode
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const { height: viewportH } = useSize(viewportRef)
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = items.length * rowHeight

  const { start, end } = useMemo(() => {
    const first = Math.floor(scrollTop / rowHeight)
    const visible = viewportH ? Math.ceil(viewportH / rowHeight) : 1
    const from = clamp(first - overscan, 0, Math.max(0, items.length - 1))
    const to = clamp(first + visible + overscan, 0, Math.max(0, items.length - 1))
    return { start: from, end: to }
  }, [scrollTop, rowHeight, viewportH, overscan, items.length])

  const slice = useMemo(() => items.slice(start, end + 1).map((item, i) => ({ item, idx: start + i })), [
    items,
    start,
    end,
  ])

  return (
    <div
      ref={viewportRef}
      className="relative h-full overflow-auto"
      onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
    >
      <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
        {slice.map(({ item, idx }) => (
          <div key={idx} className="absolute left-0 w-full" style={{ top: idx * rowHeight, height: rowHeight }}>
            {renderRow(item, idx)}
          </div>
        ))}
      </div>
    </div>
  )
}

