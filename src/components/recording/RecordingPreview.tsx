import { useCallback, useEffect, useRef, useState } from "react"
import type { BubbleShape } from "@/components/canvas/CameraBubbleSettings"
import type { CameraBubbleState } from "@/services/video/CanvasRecorder"

interface RecordingPreviewProps {
  visible: boolean
  isPreview?: boolean
  width: number
  height: number
  cameraStream: MediaStream | null
  cameraPosition: { x: number; y: number }
  cameraSize: { width: number; height: number }
  cameraShape: BubbleShape
  cameraBorderColor: string
  cameraBorderWidth: number
  cameraBorderRadius: number
  onCameraPositionChange: (pos: { x: number; y: number }) => void
  onCameraSizeChange: (size: { width: number; height: number }) => void
  onCameraBubbleStateChange?: (state: CameraBubbleState) => void
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

export function RecordingPreview({
  visible,
  isPreview = false,
  width,
  height,
  cameraStream,
  cameraPosition,
  cameraSize,
  cameraShape,
  cameraBorderColor,
  cameraBorderWidth,
  cameraBorderRadius,
  onCameraPositionChange,
  onCameraSizeChange,
  onCameraBubbleStateChange,
  videoRef: externalVideoRef,
}: RecordingPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [localPosition, setLocalPosition] = useState(cameraPosition)
  const [localSize, setLocalSize] = useState(cameraSize)

  // 外部 props 变化时同步本地状态
  useEffect(() => {
    setLocalPosition(cameraPosition)
  }, [cameraPosition])

  useEffect(() => {
    setLocalSize(cameraSize)
  }, [cameraSize])

  // 将流绑定到 video 并播放
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
      videoRef.current.play().catch(() => {})
    }
  }, [cameraStream])

  const handleCameraMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - localPosition.x,
      y: e.clientY - localPosition.y,
    })
  }, [localPosition])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      // 限制在录制区域内
      const newX = Math.max(0, Math.min(width - localSize.width, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(height - localSize.height, e.clientY - dragOffset.y))
      const newPos = { x: newX, y: newY }
      setLocalPosition(newPos)
      onCameraPositionChange(newPos)

      // 通知父组件更新录制器状态
      if (onCameraBubbleStateChange && cameraStream) {
        onCameraBubbleStateChange({
          stream: cameraStream,
          position: newPos,
          size: localSize,
          shape: cameraShape,
          borderRadius: cameraBorderRadius,
          borderColor: cameraBorderColor,
          borderWidth: cameraBorderWidth,
        })
      }
    }
    if (isResizing) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        // 根据鼠标相对容器的位置计算新尺寸
        const containerLeft = rect.left
        const containerTop = rect.top
        const newWidth = Math.max(100, Math.min(400, e.clientX - containerLeft))
        const newHeight = Math.max(75, Math.min(300, e.clientY - containerTop))
        const newSize = { width: newWidth, height: newHeight }
        setLocalSize(newSize)
        onCameraSizeChange(newSize)

        // 通知父组件更新录制器状态
        if (onCameraBubbleStateChange && cameraStream) {
          onCameraBubbleStateChange({
            stream: cameraStream,
            position: localPosition,
            size: newSize,
            shape: cameraShape,
            borderRadius: cameraBorderRadius,
            borderColor: cameraBorderColor,
            borderWidth: cameraBorderWidth,
          })
        }
      }
    }
  }, [isDragging, isResizing, width, height, localSize, localPosition, dragOffset, onCameraPositionChange, onCameraSizeChange, onCameraBubbleStateChange, cameraStream, cameraShape, cameraBorderColor, cameraBorderWidth, cameraBorderRadius])

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

  const getShapeStyle = (): React.CSSProperties => {
    switch (cameraShape) {
      case "circle":
        return { borderRadius: "50%" }
      case "pill":
        return { borderRadius: 9999 }
      default:
        return { borderRadius: cameraBorderRadius }
    }
  }

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    >
      {/* 录制区域边框 */}
      <div
        className={`absolute bg-transparent border-2 border-dashed pointer-events-auto ${isPreview ? "border-red-500" : "border-red-500"}`}
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {/* 录制/预览指示器 */}
        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 ${isPreview ? "bg-red-500" : "bg-red-500"} text-white px-3 py-1 rounded-full`}>
          <div className={`w-2 h-2 bg-white rounded-full ${isPreview ? "" : "animate-pulse"}`} />
          <span className="text-sm font-medium">{isPreview ? "预览" : "录制中"}</span>
        </div>

        {/* 右上角尺寸调整手柄 */}
        <div
          onMouseDown={handleResizeMouseDown}
          className={`absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded cursor-se-resize pointer-events-auto`}
          style={{ cursor: "se-resize" }}
        />

        {/* 录制区域内的摄像框 */}
        {cameraStream && (
          <div
            onMouseDown={handleCameraMouseDown}
            style={{
              position: "absolute",
              left: localPosition.x,
              top: localPosition.y,
              width: localSize.width,
              height: localSize.height,
              ...getShapeStyle(),
              border: `${cameraBorderWidth}px solid ${cameraBorderColor}`,
              overflow: "hidden",
              cursor: isDragging ? "grabbing" : "grab",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 10,
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* 摄像框缩放手柄 */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation()
                setIsResizing(true)
              }}
              className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize"
              style={{
                background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.6) 50%)",
              }}
            />
          </div>
        )}
      </div>

      {/* 画面比例信息 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {width} × {height}
      </div>
    </div>
  )
}
