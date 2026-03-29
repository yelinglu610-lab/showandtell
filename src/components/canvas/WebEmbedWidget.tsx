// 网页嵌入组件：在演示画布上嵌入任意网页，可拖动可缩放
import { useCallback, useEffect, useRef, useState } from "react"

export interface WebEmbedWidgetProps {
  initialUrl?: string
  initialPosition?: { x: number; y: number }
  initialSize?: { width: number; height: number }
  onClose: () => void
}

const MIN_WIDTH = 200
const MIN_HEIGHT = 150

export function WebEmbedWidget({
  initialUrl = "",
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 640, height: 480 },
  onClose,
}: WebEmbedWidgetProps) {
  const [pos, setPos] = useState(initialPosition)
  const [size, setSize] = useState(initialSize)
  const [url, setUrl] = useState(initialUrl)
  const [inputUrl, setInputUrl] = useState(initialUrl)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHover, setResizeHover] = useState(false)

  const dragOffset = useRef({ x: 0, y: 0 })
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 拖动：拖顶部工具栏移动整个组件
  const handleToolbarMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "BUTTON") return
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
      const newHeight = Math.max(MIN_HEIGHT, e.clientY - pos.y)
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

  // URL 跳转：自动走本地代理绕过 X-Frame-Options
  const handleUrlSubmit = useCallback((e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault()
    let finalUrl = inputUrl.trim()
    if (!finalUrl) return
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl
    }
    // 走本地代理（需先启动 proxy-server.js）
    const proxyUrl = `http://localhost:9999/proxy?url=${encodeURIComponent(finalUrl)}`
    setUrl(proxyUrl)
  }, [inputUrl])

  // 刷新
  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = url
    }
  }, [url])

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
        {/* 地球图标 */}
        <span style={{ fontSize: 14, lineHeight: 1 }}>🌐</span>

        {/* URL 输入框 */}
        <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: "flex" }}>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(e) }}
            placeholder="输入网址..."
            style={{
              flex: 1,
              height: 22,
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4,
              color: "#fff",
              fontSize: 12,
              padding: "0 6px",
              outline: "none",
            }}
          />
        </form>

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontSize: 14,
            padding: "0 2px",
            lineHeight: 1,
          }}
          title="刷新"
        >
          ↻
        </button>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontSize: 14,
            padding: "0 2px",
            lineHeight: 1,
          }}
          title="关闭"
        >
          ×
        </button>
      </div>

      {/* iframe 主体 */}
      <div style={{ flex: 1, position: "relative", backgroundColor: "#fff" }}>
        {url ? (
          <iframe
            ref={iframeRef}
            src={url}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              pointerEvents: isDragging || isResizing ? "none" : "auto",
            }}
            allow="camera; microphone; fullscreen; autoplay; clipboard-read; clipboard-write; payment; geolocation"
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#999",
            fontSize: 14,
          }}>
            输入网址并按回车
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
