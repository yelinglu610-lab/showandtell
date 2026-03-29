// 无限画布：自由绘图核心
import { useCallback, useEffect, useRef } from "react"
import { Excalidraw } from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"

interface DrawingCanvasProps {
  onElementsChange?: (elements: any[]) => void
  onViewportChange?: (scrollX: number, scrollY: number, zoom: number) => void
}

export function DrawingCanvas({ onElementsChange, onViewportChange }: DrawingCanvasProps) {
  const canvasApiRef = useRef<any | null>(null)

  // 视口变化回调
  useEffect(() => {
    const api = canvasApiRef.current
    if (!api || !onViewportChange) return
    const unsub = api.onScrollChange((x: number, y: number, zoom: { scale: number }) => {
      onViewportChange(x, y, zoom.scale)
    })
    return unsub
  }, [onViewportChange])

  const handleChange = useCallback((elements: any[]) => {
    onElementsChange?.(elements)
  }, [onElementsChange])

  return (
    <div className="sat-canvas w-full h-full overflow-hidden">
      <Excalidraw
        onChange={handleChange as any}
        excalidrawAPI={(api: any) => { canvasApiRef.current = api }}
      />
    </div>
  )
}
