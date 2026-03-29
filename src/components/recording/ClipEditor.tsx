// 一键剪辑：拖动裁剪区间，去掉开头结尾，导出精准片段
import { useCallback, useEffect, useRef, useState } from "react"

interface ClipEditorProps {
  videoUrl: string
  onExport: (startTime: number, endTime: number) => void
  onClose: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = Math.floor(seconds % 60).toString().padStart(2, "0")
  const ms = Math.floor((seconds % 1) * 10)
  return `${m}:${s}.${ms}`
}

export function ClipEditor({ videoUrl, onExport, onClose }: ClipEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [startRatio, setStartRatio] = useState(0)      // 0-1
  const [endRatio, setEndRatio] = useState(1)          // 0-1
  const [isPlaying, setIsPlaying] = useState(false)
  const [dragging, setDragging] = useState<"start" | "end" | "playhead" | null>(null)

  const startTime = startRatio * duration
  const endTime = endRatio * duration

  // 视频元数据加载完成
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }, [])

  // 播放时间更新
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    const t = videoRef.current.currentTime
    setCurrentTime(t)
    // 到达结束点自动暂停
    if (t >= endTime) {
      videoRef.current.pause()
      videoRef.current.currentTime = startTime
      setIsPlaying(false)
    }
  }, [endTime, startTime])

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime
      }
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying, startTime, endTime])

  // 时间线鼠标事件
  const getRatioFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current) return 0
    const rect = timelineRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }, [])

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    const ratio = getRatioFromEvent(e)
    // 判断点的是 start handle、end handle 还是 playhead
    const startX = startRatio
    const endX = endRatio
    const playX = duration > 0 ? currentTime / duration : 0

    const dist = (a: number, b: number) => Math.abs(a - b)
    const threshold = 0.02

    if (dist(ratio, startX) < threshold) {
      setDragging("start")
    } else if (dist(ratio, endX) < threshold) {
      setDragging("end")
    } else if (dist(ratio, playX) < threshold) {
      setDragging("playhead")
    } else {
      // 点击跳转播放头
      if (videoRef.current) {
        const t = ratio * duration
        videoRef.current.currentTime = t
        setCurrentTime(t)
      }
    }
  }, [startRatio, endRatio, currentTime, duration, getRatioFromEvent])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    const ratio = getRatioFromEvent(e)
    if (dragging === "start") {
      setStartRatio(Math.min(ratio, endRatio - 0.01))
    } else if (dragging === "end") {
      setEndRatio(Math.max(ratio, startRatio + 0.01))
    } else if (dragging === "playhead") {
      const t = ratio * duration
      if (videoRef.current) videoRef.current.currentTime = t
      setCurrentTime(t)
    }
  }, [dragging, endRatio, startRatio, duration, getRatioFromEvent])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  // 导出
  const handleExport = useCallback(() => {
    onExport(startTime, endTime)
  }, [onExport, startTime, endTime])

  const clipDuration = endTime - startTime

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">✂️</span>
            <h2 className="font-semibold text-sm">一键剪辑</h2>
            <span className="text-xs text-muted-foreground">拖动两端手柄裁剪片段</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>

        {/* 视频预览 */}
        <div className="bg-black flex items-center justify-center" style={{ height: 280 }}>
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="max-h-full max-w-full"
          />
        </div>

        {/* 时间线区域 */}
        <div className="px-5 py-4 space-y-3">
          {/* 时间信息 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>开始：<span className="text-foreground font-mono">{formatTime(startTime)}</span></span>
            <span className="text-primary font-medium">片段时长 {formatTime(clipDuration)}</span>
            <span>结束：<span className="text-foreground font-mono">{formatTime(endTime)}</span></span>
          </div>

          {/* 时间线 */}
          <div
            ref={timelineRef}
            className="relative h-10 bg-muted rounded cursor-pointer select-none"
            onMouseDown={handleTimelineMouseDown}
          >
            {/* 灰色遮罩（裁剪区域外） */}
            <div
              className="absolute inset-y-0 left-0 bg-black/40 rounded-l"
              style={{ width: `${startRatio * 100}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-black/40 rounded-r"
              style={{ width: `${(1 - endRatio) * 100}%` }}
            />

            {/* 选中区域高亮 */}
            <div
              className="absolute inset-y-0 bg-primary/20 border-y-2 border-primary"
              style={{ left: `${startRatio * 100}%`, width: `${(endRatio - startRatio) * 100}%` }}
            />

            {/* start handle */}
            <div
              className="absolute top-0 bottom-0 w-3 bg-primary rounded-l cursor-ew-resize flex items-center justify-center"
              style={{ left: `${startRatio * 100}%`, transform: "translateX(-100%)" }}
            >
              <div className="w-0.5 h-4 bg-white/70 rounded" />
            </div>

            {/* end handle */}
            <div
              className="absolute top-0 bottom-0 w-3 bg-primary rounded-r cursor-ew-resize flex items-center justify-center"
              style={{ left: `${endRatio * 100}%` }}
            >
              <div className="w-0.5 h-4 bg-white/70 rounded" />
            </div>

            {/* 播放头 */}
            {duration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow" />
              </div>
            )}
          </div>

          {/* 播放控制 + 导出 */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
            >
              {isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                  暂停
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  预览片段
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span>✂️</span>
                导出片段
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
