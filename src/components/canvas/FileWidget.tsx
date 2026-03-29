// 文件上传组件：在演示画布上展示上传的文件，可拖动可缩放
import { useCallback, useEffect, useRef, useState } from "react"

export interface FileWidgetProps {
  initialPosition?: { x: number; y: number }
  initialSize?: { width: number; height: number }
  onClose: () => void
}

type FileType = "image" | "video" | "pdf" | "other"

interface UploadedFile {
  url: string
  name: string
  size: number
  type: FileType
}

const MIN_WIDTH = 200
const MIN_HEIGHT = 150

function getFileType(file: File): FileType {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("video/")) return "video"
  if (file.type === "application/pdf") return "pdf"
  return "other"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileWidget({
  initialPosition = { x: 150, y: 150 },
  initialSize = { width: 480, height: 360 },
  onClose,
}: FileWidgetProps) {
  const [pos, setPos] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHover, setResizeHover] = useState(false)
  const [dragOver, setDragOver] = useState(false) // 拖拽文件悬停

  const dragOffset = useRef({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理上传的文件
  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setUploaded({
      url,
      name: file.name,
      size: file.size,
      type: getFileType(file),
    })
  }, [])

  // 点击上传
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  // 拖拽上传文件
  const handleDropFile = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  // 拖动组件（拖顶部工具栏）
  const handleToolbarMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "BUTTON") return
    e.preventDefault()
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [pos])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    if (isResizing) {
      const newWidth = Math.max(MIN_WIDTH, e.clientX - pos.x)
      const newHeight = Math.max(MIN_HEIGHT, e.clientY - pos.y - 32)
      setSize({ width: newWidth, height: newHeight })
    }
  }, [isDragging, isResizing, pos])

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

  // 清理 blob URL
  useEffect(() => {
    return () => {
      if (uploaded?.url) URL.revokeObjectURL(uploaded.url)
    }
  }, [uploaded?.url])

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height + 32,
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* 顶部工具栏 */}
      <div
        onMouseDown={handleToolbarMouseDown}
        style={{
          height: 32,
          backgroundColor: "#1a1a2e",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: 6,
          cursor: isDragging ? "grabbing" : "grab",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {uploaded ? `📄 ${uploaded.name}` : "📎 上传文件"}
        </span>
        {uploaded && (
          <button
            onClick={() => setUploaded(null)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12 }}
            title="重新上传"
          >
            换
          </button>
        )}
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16 }}
          title="关闭"
        >
          ×
        </button>
      </div>

      {/* 内容区 */}
      <div
        style={{ flex: 1, position: "relative", backgroundColor: "#fafafa", overflow: "hidden" }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropFile}
      >
        {!uploaded ? (
          // 上传区域
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: `2px dashed ${dragOver ? "#FFD600" : "#ccc"}`,
              backgroundColor: dragOver ? "#FFFDE7" : "transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>📂</span>
            <span style={{ fontSize: 14, color: "#666" }}>拖拽文件到这里 或 点击上传</span>
            <span style={{ fontSize: 12, color: "#999" }}>支持图片、PDF、视频，无大小限制</span>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleInputChange}
              accept="image/*,video/*,application/pdf,*/*"
            />
          </div>
        ) : (
          // 文件内容
          <div style={{ width: "100%", height: "100%", pointerEvents: isDragging || isResizing ? "none" : "auto" }}>
            {uploaded.type === "image" && (
              <img
                src={uploaded.url}
                alt={uploaded.name}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            )}
            {uploaded.type === "video" && (
              <video
                src={uploaded.url}
                controls
                style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
              />
            )}
            {uploaded.type === "pdf" && (
              <iframe
                src={uploaded.url}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            )}
            {uploaded.type === "other" && (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "#555",
              }}>
                <span style={{ fontSize: 40 }}>📄</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{uploaded.name}</span>
                <span style={{ fontSize: 12, color: "#999" }}>{formatSize(uploaded.size)}</span>
              </div>
            )}
          </div>
        )}

        {/* 缩放 handle */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setIsResizing(true)
          }}
          onMouseEnter={() => setResizeHover(true)}
          onMouseLeave={() => setResizeHover(false)}
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            width: resizeHover ? 16 : 12,
            height: resizeHover ? 16 : 12,
            backgroundColor: "#FFD600",
            borderRadius: 2,
            cursor: "se-resize",
            transition: "width 0.15s, height 0.15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            zIndex: 10,
          }}
        />
      </div>
    </div>
  )
}
