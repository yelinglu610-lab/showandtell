// ShowAndTell 根组件
import { useCallback, useEffect, useRef, useState } from "react"
import { Header, MainLayout } from "@/components/layout"
import { DraggableRecordingControls } from "@/components/recording/DraggableRecordingControls"
import { RecordingPreview } from "@/components/recording/RecordingPreview"
import { PreviewPlayer } from "@/components/recording/PreviewPlayer"
import { ClipEditor } from "@/components/recording/ClipEditor"
import { DrawingCanvas, CameraBubble, WebEmbedWidget, FileWidget } from "@/components/canvas"
import { RightPanel } from "@/components/layout/RightPanel"
import { LanguageSelector, ThemeToggle } from "@/components/ui"
import { useMediaDevices, useRecordingFlow, useExport } from "@/hooks"
import { defaultBeautySettings, type BeautySettings } from "@/services/beauty/BeautyFilter"
import type { BubbleShape } from "@/components/canvas/CameraBubbleSettings"

// 浮动网页实例
interface WebWidget {
  id: string
  url: string
  pos: { x: number; y: number }
  size: { width: number; height: number }
}

// 浮动文件实例
interface FileWidgetInstance {
  id: string
  pos: { x: number; y: number }
  size: { width: number; height: number }
}

function App() {
  // 媒体设备
  const {
    cameraStream,
    micStream,
    isCameraEnabled,
    isMicEnabled,
    toggleCamera,
    toggleMic,
    startCamera,
    startMic,
  } = useMediaDevices()

  // 录制状态机
  const {
    state: recordingState,
    isPreviewing,
    showPreview,
    duration,
    startPreviewWithFrameDims,
    cancelPreview,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setCameraBubbleState,
  } = useRecordingFlow()

  const { exportAndDownload } = useExport()

  // 美颜
  const [beautyEnabled, setBeautyEnabled] = useState(false)
  const [beautySettings, setBeautySettingsState] = useState<BeautySettings>(defaultBeautySettings)

  // UI
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showClipEditor, setShowClipEditor] = useState(false)
  const [rightPanelVisible, setRightPanelVisible] = useState(false)

  // 浮动组件
  const [webWidgets, setWebWidgets] = useState<WebWidget[]>([])
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

  useEffect(() => { cameraStreamRef.current = cameraStream }, [cameraStream])

  // 初始化摄像头和麦克风
  useEffect(() => {
    const init = async () => {
      if (isCameraEnabled && !cameraStream) {
        try {
          const stream = await startCamera()
          setCameraBubbleState({
            stream,
            position: cameraBubblePosition.current,
            size: cameraBubbleSize.current,
            shape: cameraBubbleShape,
            borderRadius: cameraBubbleBorderRadius,
            borderColor: cameraBubbleBorderColor,
            borderWidth: cameraBubbleBorderWidth,
          })
        } catch (err) { console.error("摄像头初始化失败:", err) }
      }
      if (isMicEnabled) {
        try { await startMic() } catch (err) { console.error("麦克风初始化失败:", err) }
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 录制事件
  const handleCancelRecording = useCallback(() => cancelPreview(), [cancelPreview])

  const handleStartRecording = useCallback(async () => {
    try { await startRecording() } catch (err) { console.error("录制启动失败:", err) }
  }, [startRecording])

  const handleRecord = useCallback(async () => {
    let cam = cameraStream
    let mic = micStream
    try { if (!cam) cam = await startCamera() } catch { /* ignore */ }
    try { if (!mic) mic = await startMic() } catch { /* ignore */ }

    const canvas = document.querySelector(".sat-canvas canvas") as HTMLCanvasElement

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
      canvas,
      cameraVideo: cameraVideoRef.current,
      audioStream: mic,
      beautyEnabled,
      beautySettings,
      avatarEnabled: false,
      avatarStream: null,
      projectId: undefined,
    })
  }, [cameraStream, micStream, startCamera, startMic, startPreviewWithFrameDims,
      beautyEnabled, beautySettings, cameraBubbleShape, cameraBubbleBorderColor,
      cameraBubbleBorderWidth, cameraBubbleBorderRadius])

  const handleStop = useCallback(async () => {
    const blob = await stopRecording()
    if (blob) {
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    }
  }, [stopRecording])
  const handlePause = useCallback(() => pauseRecording(), [pauseRecording])
  const handleResume = useCallback(() => resumeRecording(), [resumeRecording])

  // 导出
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

  const handlePreviewClose = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setShowClipEditor(false)
  }, [previewUrl])

  // 一键剪辑导出
  const handleClipExport = useCallback(async (startTime: number, endTime: number) => {
    if (!previewUrl) return
    // 用 FFmpeg 裁剪片段
    try {
      const { videoConverter } = await import("@/services/video/VideoConverter")
      const response = await fetch(previewUrl)
      const blob = await response.blob()
      const clipped = await videoConverter.exportToBlob(blob, {
        format: "mp4",
        quality: "high",
        fps: 30,
        startTime,
        endTime,
      })
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
    } catch (err) {
      console.error("剪辑失败:", err)
    }
    setShowClipEditor(false)
    setPreviewUrl(null)
  }, [previewUrl])

  // 摄像头开关
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
  }, [toggleCamera, setCameraBubbleState, cameraBubbleShape,
      cameraBubbleBorderColor, cameraBubbleBorderWidth, cameraBubbleBorderRadius])

  const handleToggleMic = useCallback(async () => { await toggleMic() }, [toggleMic])

  // 浮动组件
  const addWebWidget = useCallback(() => {
    const id = `web-${Date.now()}`
    setWebWidgets(prev => [...prev, {
      id, url: "",
      pos: { x: 120 + prev.length * 20, y: 120 + prev.length * 20 },
      size: { width: 640, height: 480 },
    }])
  }, [])

  const addFileWidget = useCallback(() => {
    const id = `file-${Date.now()}`
    setFileWidgets(prev => [...prev, {
      id,
      pos: { x: 160 + prev.length * 20, y: 160 + prev.length * 20 },
      size: { width: 480, height: 360 },
    }])
  }, [])

  return (
    <>
      <MainLayout
        header={
          <Header
            onTogglePanel={() => setRightPanelVisible(v => !v)}
            panelVisible={rightPanelVisible}
            languageSelector={<LanguageSelector />}
            themeToggle={<ThemeToggle />}
            onAddWebWidget={addWebWidget}
            onAddFileWidget={addFileWidget}
          />
        }
        canvas={
          <div className="relative w-full h-full overflow-hidden bg-[#FAFAFA]">
            {/* 无限画布 */}
            <DrawingCanvas
              onElementsChange={() => {}}
              onViewportChange={() => {}}
            />

            {/* 摄像框 */}
            <CameraBubble
              stream={isCameraEnabled && (recordingState === "idle" || recordingState === "previewing")
                ? cameraStream : null}
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

            {/* 浮动网页 */}
            {webWidgets.map(w => (
              <WebEmbedWidget
                key={w.id}
                initialUrl={w.url}
                initialPosition={w.pos}
                initialSize={w.size}
                onClose={() => setWebWidgets(prev => prev.filter(x => x.id !== w.id))}
              />
            ))}

            {/* 浮动文件 */}
            {fileWidgets.map(w => (
              <FileWidget
                key={w.id}
                initialPosition={w.pos}
                initialSize={w.size}
                onClose={() => setFileWidgets(prev => prev.filter(x => x.id !== w.id))}
              />
            ))}

            {/* 录制预览 */}
            <RecordingPreview
              visible={showPreview}
              isPreview={isPreviewing}
              width={Math.round(1920 * 1.1)}
              height={Math.round(1080 * 1.1)}
              cameraStream={cameraStream}
              cameraPosition={cameraBubblePosition.current}
              cameraSize={cameraBubbleSize.current}
              cameraShape={cameraBubbleShape}
              cameraBorderColor={cameraBubbleBorderColor}
              cameraBorderWidth={cameraBubbleBorderWidth}
              cameraBorderRadius={cameraBubbleBorderRadius}
              onCameraPositionChange={pos => { cameraBubblePosition.current = pos }}
              onCameraSizeChange={size => { cameraBubbleSize.current = size }}
              videoRef={cameraVideoRef}
            />

            {/* 录制控制条 */}
            <DraggableRecordingControls
              state={recordingState}
              duration={duration}
              onRecord={isPreviewing ? handleStartRecording : handleRecord}
              onStop={handleStop}
              onCancel={isPreviewing ? handleCancelRecording : undefined}
              onPause={recordingState === "recording" ? handlePause : undefined}
              onResume={recordingState === "paused" ? handleResume : undefined}
            />
          </div>
        }
        rightPanel={
          rightPanelVisible ? (
            <RightPanel
              beautyEnabled={beautyEnabled}
              beautySettings={beautySettings}
              onBeautySettingChange={(key, value) =>
                setBeautySettingsState(prev => ({ ...prev, [key]: value }))}
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
              onMicToggle={handleToggleMic}
            />
          ) : null
        }
      />

      {/* 录制完成：预览播放器 */}
      {previewUrl && !showClipEditor && (
        <PreviewPlayer
          src={previewUrl}
          onClose={handlePreviewClose}
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
    </>
  )
}

export default App
