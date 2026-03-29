// 画笔/激光笔覆盖层：透明 canvas 浮在屏幕上
import { useCallback, useEffect, useRef } from "react"

export type DrawingTool = "pen" | "laser" | "none"

interface DrawingOverlayProps {
  tool: DrawingTool
  color: string
  strokeWidth: number
  active: boolean       // 只有 active 时才可以画
}

interface Point { x: number; y: number }

// 激光笔轨迹点（带时间戳，用于淡出）
interface LaserPoint extends Point { t: number }

export function DrawingOverlay({ tool, color, strokeWidth, active }: DrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<Point | null>(null)
  const laserTrail = useRef<LaserPoint[]>([])
  const rafRef = useRef<number>(0)

  // 画笔：直接画到 canvas，保留
  const drawPen = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
  }, [color, strokeWidth])

  // 激光笔：动画轨迹，自动淡出
  const renderLaser = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const now = Date.now()
    const FADE_DURATION = 600 // ms 淡出时间

    // 清除激光层（不清画笔层）
    // 用 compositeOperation 实现：激光单独渲染
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 重绘画笔内容（从 penCanvas）
    // 激光轨迹淡出
    laserTrail.current = laserTrail.current.filter(p => now - p.t < FADE_DURATION)

    if (laserTrail.current.length > 1) {
      for (let i = 1; i < laserTrail.current.length; i++) {
        const prev = laserTrail.current[i - 1]
        const curr = laserTrail.current[i]
        const age = now - curr.t
        const alpha = Math.max(0, 1 - age / FADE_DURATION)

        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(curr.x, curr.y)
        ctx.strokeStyle = `rgba(255, 40, 40, ${alpha})`
        ctx.lineWidth = strokeWidth * 1.5
        ctx.lineCap = "round"
        ctx.stroke()
      }

      // 激光头红点
      const last = laserTrail.current[laserTrail.current.length - 1]
      const headAge = now - last.t
      const headAlpha = Math.max(0, 1 - headAge / FADE_DURATION)
      ctx.beginPath()
      ctx.arc(last.x, last.y, strokeWidth * 2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 40, 40, ${headAlpha})`
      ctx.fill()
    }

    rafRef.current = requestAnimationFrame(renderLaser)
  }, [strokeWidth])

  // 画笔用独立 canvas 保留笔迹
  const penCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (tool === "laser") {
      rafRef.current = requestAnimationFrame(renderLaser)
      return () => cancelAnimationFrame(rafRef.current)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
  }, [tool, renderLaser])

  const getPos = (e: MouseEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!active || tool === "none") return
    isDrawing.current = true
    const pos = getPos(e)
    lastPoint.current = pos
    if (tool === "laser") {
      laserTrail.current = [{ ...pos, t: Date.now() }]
    }
  }, [active, tool])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current || !active) return
    const pos = getPos(e)

    if (tool === "pen") {
      const penCtx = penCanvasRef.current?.getContext("2d")
      if (penCtx && lastPoint.current) {
        drawPen(penCtx, lastPoint.current, pos)
      }
    } else if (tool === "laser") {
      laserTrail.current.push({ ...pos, t: Date.now() })
    }

    lastPoint.current = pos
  }, [active, tool, drawPen])

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false
    lastPoint.current = null
  }, [])

  // 清空画笔
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const penCtx = penCanvasRef.current?.getContext("2d")
        if (penCtx && penCanvasRef.current) {
          penCtx.clearRect(0, 0, penCanvasRef.current.width, penCanvasRef.current.height)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (!active || tool === "none") return null

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
      {/* 画笔持久层 */}
      <canvas
        ref={penCanvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
      {/* 交互层（激光/画笔事件） */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          position: "absolute", inset: 0,
          cursor: tool === "pen" ? "crosshair" : "none",
          pointerEvents: "auto",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}
