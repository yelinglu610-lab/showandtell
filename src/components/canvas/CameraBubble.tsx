// 摄像框组件：可拖动、可缩放、滚轮缩放、多种形状
import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

export interface CameraBubbleProps {
  stream: MediaStream | null
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  shape?: "rounded-rect" | "circle" | "pill"
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
  onPositionChange?: (pos: { x: number; y: number }) => void
  onSizeChange?: (size: { width: number; height: number }) => void
  videoRef?: RefObject<HTMLVideoElement | null>
}

const MIN_WIDTH = 80
const MIN_HEIGHT = 60
const MAX_WIDTH = 800
const MAX_HEIGHT = 600

export function CameraBubble({
  stream,
  position = { x: 50, y: 50 },
  size = { width: 200, height: 150 },
  shape = "rounded-rect",
  borderRadius = 16,
  borderColor = "#ffffff",
  borderWidth = 3,
  onPositionChange,
  onSizeChange,
  videoRef: externalVideoRef,
}: CameraBubbleProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const containerRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState(position)
  const [s, setS] = useState(size)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandleHover, setResizeHandleHover] = useState(false)

  const dragOffset = useRef({ x: 0, y: 0 })

  // 同步外部 stream 到 video 元素
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream, videoRef])

  // 同步外部 position/size 变化
  useEffect(() => { setPos(position) }, [position.x, position.y])
  useEffect(() => { setS(size) }, [size.width, size.height])

  // 拖动：鼠标按住视频区域任意位置可拖动
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 阻止 resize handle 触发拖动
    if ((e.target as HTMLElement).dataset.resize) return
    e.preventDefault()
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [pos])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPos = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }
      setPos(newPos)
      onPositionChange?.(newPos)
    }
    if (isResizing) {
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX - pos.x))
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, e.clientY - pos.y))
      const newSize = { width: newWidth, height: newHeight }
      setS(newSize)
      onSizeChange?.(newSize)
    }
  }, [isDragging, isResizing, pos, onPositionChange, onSizeChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // 滚轮缩放：等比缩放，每格 10%
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(s.width * factor)))
    const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(s.height * factor)))
    const newSize = { width: newWidth, height: newHeight }
    setS(newSize)
    onSizeChange?.(newSize)
  }, [s, onSizeChange])

  // 形状样式
  const getShapeStyle = (): React.CSSProperties => {
    switch (shape) {
      case "circle": {
        const d = Math.min(s.width, s.height)
        return { borderRadius: "50%", width: d, height: d }
      }
      case "pill":
        return { borderRadius: 9999 }
      default:
        return { borderRadius }
    }
  }

  const shapeStyle = getShapeStyle()
  const displayWidth = shape === "circle" ? Math.min(s.width, s.height) : s.width
  const displayHeight = shape === "circle" ? Math.min(s.width, s.height) : s.height

  if (!stream) return null

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: displayWidth,
        height: displayHeight,
        ...shapeStyle,
        border: `${borderWidth}px solid ${isDragging ? "rgba(59, 130, 246, 0.6)" : borderColor}`,
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "grab",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 1000,
        transition: isDragging || isResizing ? "none" : "border-color 0.2s",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
          pointerEvents: "none",
        }}
      />
      {/* 缩放 handle：右下角黄色方块 */}
      <div
        data-resize="true"
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setIsResizing(true)
        }}
        onMouseEnter={() => setResizeHandleHover(true)}
        onMouseLeave={() => setResizeHandleHover(false)}
        style={{
          position: "absolute",
          right: 2,
          bottom: 2,
          width: resizeHandleHover ? 16 : 12,
          height: resizeHandleHover ? 16 : 12,
          backgroundColor: "#FFD600",
          borderRadius: 2,
          cursor: "se-resize",
          transition: "width 0.15s, height 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  )
}
