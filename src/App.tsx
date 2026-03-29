// ShowAndTell 根组件
import { useCallback, useRef, useState } from "react"
import { WelcomePage } from "@/pages/WelcomePage"
import { CameraBubble, FileWidget, DrawingOverlay } from "@/components/canvas"
import { RightPanel } from "@/components/layout/RightPanel"
import { DraggableRecordingControls } from "@/components/recording/DraggableRecordingControls"
import { PreviewPlayer } from "@/components/recording/PreviewPlayer"
import { ClipEditor } from "@/components/recording/ClipEditor"
import { useMediaDevices, useRecordingFlow, useExport } from "@/hooks"
import { defaultBeautySettings, type BeautySettings } from "@/services/beauty/BeautyFilter"
import type { BubbleShape } from "@/components/canvas/CameraBubbleSettings"
import type { DrawingTool } from "@/components/canvas/DrawingOverlay"

interface FileWidgetInstance {
  id: string
  pos: { x: number; y: number }
  size: { width: number; height: number }
}

// 颜色预设
const COLORS = ["#FF3B30", "#FF9500", "#FFD600", "#34C759", "#007AFF", "#AF52DE", "#fff", "#1c1c1e"]

function App() {
  const [page, setPage] = useState<"welcome" | "editor">("welcome")

  // 工具栏
  const [activeTool, setActiveTool] = useState<DrawingTool>("none")
  const [penColor, setPenColor] = useState("#FF3B30")
  const [penWidth, setPenWidth] = useState(4)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [rightPanelVisible, setRightPanelVisible] = useState(false)

  // 浮动文件
  const [fileWidgets, setFileWidgets] = useState<FileWidgetInstance[]>([])

  // 摄像框
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraBubblePosition = useRef({ x: 50, y: 50 })
  const cameraBubbleSize = useRef({ width: 200, height: 150 })
  const [cameraBubbleShape, setCameraBubbleShape] = useState<BubbleShape>("rounded-rect")
  const [cameraBubbleBorderColor, setCameraBubbleBorderColor] = useState("#ffffff")
  const [cameraBubbleBorderWidth, setCameraBubbleBorderWidth] = useState(3)
  const [cameraBubbleBorderRadius, setCameraBubbleBorderRadius] = useState(16)

  // 美颜
  const [beautyEnabled, setBeautyEnabled] = useState(false)
  const [beautySettings, setBeautySettingsState] = useState<BeautySettings>(defaultBeautySettings)

  // 录制
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showClipEditor, setShowClipEditor] = useState(false)

  const { cameraStream, micStream, isCameraEnabled, isMicEnabled, toggleCamera, toggleMic, startCamera, startMic } = useMediaDevices()
  const { state: recordingState, isPreviewing, duration, startPreviewWithFrameDims, cancelPreview, startRecording, pauseRecording, resumeRecording, stopRecording, setCameraBubbleState } = useRecordingFlow()
  const { exportAndDownload } = useExport()

  const handleRecord = useCallback(async () => {
    let cam = cameraStream
    let mic = micStream
    try { if (!cam) cam = await startCamera() } catch { /* ignore */ }
    try { if (!mic) mic = await startMic() } catch { /* ignore */ }

    await startPreviewWithFrameDims({
      frameWidth: 1920,
      frameHeight: 1080,
      cameraBubble: {
        stream: cam,
        position: cameraBubblePosition.current,
        size: cameraBubbleSize.current,
        shape: cameraBubbleShape,
        borderRadius: cameraBubbleBorderRadius,
        borderColor: cameraBubbleBorderColor,
        borderWidth: cameraBubbleBorderWidth,
      },
      canvas: null,
      cameraVideo: cameraVideoRef.current,
      audioStream: mic,
      beautyEnabled,
      beautySettings,
      avatarEnabled: false,
      avatarStream: null,
    })
  }, [cameraStream, micStream, startCamera, startMic, startPreviewWithFrameDims,
      beautyEnabled, beautySettings, cameraBubbleShape, cameraBubbleBorderColor,
      cameraBubbleBorderWidth, cameraBubbleBorderRadius])

  const handleStop = useCallback(async () => {
    const blob = await stopRecording()
    if (blob) setPreviewUrl(URL.createObjectURL(blob))
  }, [stopRecording])

  const handleDownload = useCallback(() => {
    if (!previewUrl) return
    const a = document.createElement("a")
    a.href = previewUrl
    a.download = `showandtell-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [previewUrl])

  const handleExport = useCallback(async () => {
    if (!previewUrl) return
    await exportAndDownload(previewUrl, "mp4")
    setPreviewUrl(null)
  }, [previewUrl, exportAndDownload])

  const handleClipExport = useCallback(async (startTime: number, endTime: number) => {
    if (!previewUrl) return
    try {
      const { videoConverter } = await import("@/services/video/VideoConverter")
      const response = await fetch(previewUrl)
      const blob = await response.blob()
      const clipped = await videoConverter.exportToBlob(blob, { format: "mp4", quality: "high", fps: 30, startTime, endTime })
      if (clipped) {
        const url = URL.createObjectURL(clipped)
        const a = document.createElement("a")
        a.href = url
        a.download = `clip-${Date.now()}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) { console.error("剪辑失败:", err) }
    setShowClipEditor(false)
    setPreviewUrl(null)
  }, [previewUrl])

  const handleToggleCamera = useCallback(async () => {
    await toggleCamera()
    setCameraBubbleState({
      stream: cameraStreamRef.current,
      position: cameraBubblePosition.current,
      size: cameraBubbleSize.current,
      shape: cameraBubbleShape,
      borderRadius: cameraBubbleBorderRadius,
      borderColor: cameraBubbleBorderColor,
      borderWidth: cameraBubbleBorderWidth,
    })
  }, [toggleCamera, setCameraBubbleState, cameraBubbleShape, cameraBubbleBorderColor, cameraBubbleBorderWidth, cameraBubbleBorderRadius])

  const addFileWidget = useCallback(() => {
    const id = `file-${Date.now()}`
    setFileWidgets(prev => [...prev, {
      id,
      pos: { x: 160 + prev.length * 20, y: 160 + prev.length * 20 },
      size: { width: 480, height: 360 },
    }])
  }, [])

  // 欢迎页
  if (page === "welcome") {
    return <WelcomePage onStart={() => setPage("editor")} />
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#f5f5f5" }}>

      {/* 顶部工具栏 */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 52,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
        zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: "#4E342E",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>🎬</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#4E342E" }}>ShowAndTell</span>
        </div>

        <div style={{ width: 1, height: 24, background: "#e0e0e0", margin: "0 4px" }} />

        {/* 工具：画笔 */}
        <ToolBtn
          active={activeTool === "pen"}
          onClick={() => setActiveTool(t => t === "pen" ? "none" : "pen")}
          title="画笔 (B)"
        >🖊</ToolBtn>

        {/* 工具：激光笔 */}
        <ToolBtn
          active={activeTool === "laser"}
          onClick={() => setActiveTool(t => t === "laser" ? "none" : "laser")}
          title="激光笔 (L)"
        >🔴</ToolBtn>

        {/* 颜色选择 */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowColorPicker(v => !v)}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: penColor, border: "2px solid rgba(0,0,0,0.12)",
              cursor: "pointer", flexShrink: 0,
            }}
            title="颜色"
          />
          {showColorPicker && (
            <div style={{
              position: "absolute", top: 36, left: 0,
              background: "#fff", borderRadius: 12, padding: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              display: "flex", gap: 6, flexWrap: "wrap", width: 160, zIndex: 200,
            }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setPenColor(c); setShowColorPicker(false) }}
                  style={{
                    width: 28, height: 28, borderRadius: 8, background: c,
                    border: c === penColor ? "3px solid #4E342E" : "2px solid rgba(0,0,0,0.1)",
                    cursor: "pointer",
                  }}
                />
              ))}
              {/* 粗细 */}
              <div style={{ width: "100%", marginTop: 4 }}>
                <input type="range" min={2} max={16} value={penWidth}
                  onChange={e => setPenWidth(Number(e.target.value))}
                  style={{ width: "100%" }} />
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>粗细 {penWidth}px</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: "#e0e0e0", margin: "0 4px" }} />

        {/* 插入图片 */}
        <ToolBtn onClick={addFileWidget} title="插入图片">🖼</ToolBtn>

        {/* 回欢迎页 */}
        <ToolBtn onClick={() => setPage("welcome")} title="返回首页">🏠</ToolBtn>

        <div style={{ flex: 1 }} />

        {/* 摄像框设置 */}
        <ToolBtn
          active={rightPanelVisible}
          onClick={() => setRightPanelVisible(v => !v)}
          title="摄像框 & 美颜"
        >📷</ToolBtn>
      </div>

      {/* 主内容区 */}
      <div style={{ position: "absolute", inset: 0, top: 52 }}>

        {/* 画笔/激光笔覆盖层 */}
        <DrawingOverlay
          tool={activeTool}
          color={penColor}
          strokeWidth={penWidth}
          active={page === "editor"}
        />

        {/* 摄像框 */}
        <CameraBubble
          stream={isCameraEnabled ? cameraStream : null}
          position={cameraBubblePosition.current}
          size={cameraBubbleSize.current}
          shape={cameraBubbleShape}
          borderColor={cameraBubbleBorderColor}
          borderWidth={cameraBubbleBorderWidth}
          borderRadius={cameraBubbleBorderRadius}
          videoRef={cameraVideoRef}
          onPositionChange={pos => { cameraBubblePosition.current = pos }}
          onSizeChange={size => { cameraBubbleSize.current = size }}
        />

        {/* 浮动图片文件 */}
        {fileWidgets.map(w => (
          <FileWidget
            key={w.id}
            initialPosition={w.pos}
            initialSize={w.size}
            onClose={() => setFileWidgets(prev => prev.filter(x => x.id !== w.id))}
          />
        ))}

        {/* 录制控制条 */}
        <DraggableRecordingControls
          state={recordingState}
          duration={duration}
          onRecord={isPreviewing ? startRecording : handleRecord}
          onStop={handleStop}
          onCancel={isPreviewing ? cancelPreview : undefined}
          onPause={recordingState === "recording" ? pauseRecording : undefined}
          onResume={recordingState === "paused" ? resumeRecording : undefined}
        />

        {/* 右侧面板 */}
        {rightPanelVisible && (
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 280,
            background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)",
            borderLeft: "1px solid rgba(0,0,0,0.08)", overflowY: "auto", zIndex: 90,
          }}>
            <RightPanel
              beautyEnabled={beautyEnabled}
              beautySettings={beautySettings}
              onBeautySettingChange={(key, value) => setBeautySettingsState(prev => ({ ...prev, [key]: value }))}
              onBeautyToggle={() => setBeautyEnabled(v => !v)}
              onBeautyReset={() => setBeautySettingsState(defaultBeautySettings)}
              cameraBubbleShape={cameraBubbleShape}
              cameraBubbleBorderColor={cameraBubbleBorderColor}
              cameraBubbleBorderWidth={cameraBubbleBorderWidth}
              cameraBubbleBorderRadius={cameraBubbleBorderRadius}
              cameraBubbleSize={cameraBubbleSize.current}
              onCameraBubbleShapeChange={setCameraBubbleShape}
              onCameraBubbleBorderColorChange={setCameraBubbleBorderColor}
              onCameraBubbleBorderWidthChange={setCameraBubbleBorderWidth}
              onCameraBubbleBorderRadiusChange={setCameraBubbleBorderRadius}
              onCameraBubbleSizeChange={size => { cameraBubbleSize.current = size }}
              onCameraBubblePositionPreset={pos => { cameraBubblePosition.current = pos }}
              cameraEnabled={isCameraEnabled}
              micEnabled={isMicEnabled}
              onCameraToggle={handleToggleCamera}
              onMicToggle={toggleMic}
            />
          </div>
        )}
      </div>

      {/* 预览播放器 */}
      {previewUrl && !showClipEditor && (
        <PreviewPlayer
          src={previewUrl}
          onClose={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}
          onExport={handleExport}
          onDownload={handleDownload}
          onClip={() => setShowClipEditor(true)}
        />
      )}

      {/* 一键剪辑 */}
      {previewUrl && showClipEditor && (
        <ClipEditor
          videoUrl={previewUrl}
          onExport={handleClipExport}
          onClose={() => setShowClipEditor(false)}
        />
      )}
    </div>
  )
}

// 工具按钮
function ToolBtn({ children, onClick, active, title }: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36, borderRadius: 8, border: "none",
        background: active ? "#FFD600" : "transparent",
        cursor: "pointer", fontSize: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s",
        boxShadow: active ? "0 2px 8px rgba(255,214,0,0.4)" : "none",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f5f5f5" }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      {children}
    </button>
  )
}

export default App
