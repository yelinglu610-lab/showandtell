import { useCallback, useEffect, useRef, useState } from "react"
import { CanvasRecorder, type CameraBubbleState, type PreviewAreaState } from "@/services/video/CanvasRecorder"
import type { BeautySettings } from "@/services/beauty/BeautyFilter"

export type RecorderState = "idle" | "recording" | "paused" | "stopped"

export interface UseCanvasRecorderReturn {
  state: RecorderState
  duration: number
  recordedBlob: Blob | null
  previewArea: PreviewAreaState
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<Blob | null>
  setCameraBubbleState: (state: CameraBubbleState) => void
  setDemoCanvas: (canvas: HTMLCanvasElement | null) => void
  setCameraVideo: (video: HTMLVideoElement | null) => void
  setAudioStream: (stream: MediaStream | null) => void
  setBeautySettings: (enabled: boolean, settings?: BeautySettings) => void
  setPreviewArea: (area: PreviewAreaState) => void
}

export function useCanvasRecorder(): UseCanvasRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle")
  const [duration, setDuration] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [previewArea, setPreviewAreaState] = useState<PreviewAreaState>({ x: 0, y: 0, width: 1280, height: 720 })

  const recorderRef = useRef<CanvasRecorder | null>(null)
  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedDurationRef = useRef<number>(0)
  const demoCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraBubbleStateRef = useRef<CameraBubbleState | null>(null)
  const previewAreaRef = useRef<PreviewAreaState>(previewArea)

  // 同步预览区域 ref
  useEffect(() => {
    previewAreaRef.current = previewArea
  }, [previewArea])

  // 初始化录制器
  useEffect(() => {
    recorderRef.current = new CanvasRecorder({ fps: 30 })

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      recorderRef.current?.destroy()
    }
  }, [])

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setDuration(elapsed)
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
    pausedDurationRef.current = elapsed
  }, [])

  const setPreviewArea = useCallback((area: PreviewAreaState) => {
    setPreviewAreaState(area)
    previewAreaRef.current = area
    recorderRef.current?.setPreviewArea(area)
  }, [])

  const setCameraBubbleState = useCallback((state: CameraBubbleState) => {
    cameraBubbleStateRef.current = state
    recorderRef.current?.setCameraBubble(state)
  }, [])

  const setAudioStream = useCallback((stream: MediaStream | null) => {
    recorderRef.current?.setAudioStream(stream)
  }, [])

  const setDemoCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    demoCanvasRef.current = canvas
    recorderRef.current?.setDemoCanvas(canvas)
  }, [])

  const setCameraVideo = useCallback((video: HTMLVideoElement | null) => {
    cameraVideoRef.current = video
    recorderRef.current?.setCameraVideo(video)
  }, [])

  const setBeautySettings = useCallback((enabled: boolean, settings?: BeautySettings) => {
    recorderRef.current?.setBeautySettings(enabled, settings)
  }, [])

  const startRecording = useCallback(async () => {
    if (!recorderRef.current || state === "recording") return

    // 查找演示画布 canvas
    const demoContainer = document.querySelector(".sat-canvas") as HTMLElement
    if (demoContainer) {
      const demoCanvas = demoContainer.querySelector("canvas")
      if (demoCanvas) {
        demoCanvasRef.current = demoCanvas
        recorderRef.current.setDemoCanvas(demoCanvas)
      }
    }

    // 创建与预览区域同尺寸的 canvas
    const { width, height } = previewAreaRef.current
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    recorderRef.current.initialize(canvas)

    // 设置录制器预览区域
    recorderRef.current.setPreviewArea(previewAreaRef.current)

    // 应用摄像框状态
    if (cameraBubbleStateRef.current) {
      recorderRef.current.setCameraBubble(cameraBubbleStateRef.current)
    }

    try {
      await recorderRef.current.start()
      setState("recording")
      pausedDurationRef.current = 0
      startTimer()
    } catch (err) {
      console.error("Failed to start recording:", err)
      setState("idle")
    }
  }, [state, startTimer])

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause()
    stopTimer()
    setState("paused")
  }, [stopTimer])

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume()
    startTimer()
    setState("recording")
  }, [startTimer])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    stopTimer()
    setState("stopped")

    // 重置时长
    pausedDurationRef.current = 0
    setDuration(0)

    const blob = await recorderRef.current?.stop() || null
    setRecordedBlob(blob)
    setState("idle")
    return blob
  }, [stopTimer])

  return {
    state,
    duration,
    recordedBlob,
    previewArea,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setCameraBubbleState,
    setDemoCanvas,
    setCameraVideo,
    setAudioStream,
    setBeautySettings,
    setPreviewArea,
  }
}
