// 录制流程状态机

import { useCallback, useState } from "react"
import type { RecordingState } from "@/types"
import type { CameraBubbleState, PreviewAreaState } from "@/services/video/CanvasRecorder"
import type { BeautySettings } from "@/services/beauty/BeautyFilter"
import { useCanvasRecorder } from "@/hooks"

export interface RecordingFlowConfig {
  previewArea: PreviewAreaState
  cameraBubble: CameraBubbleState
  canvas: HTMLCanvasElement | null
  cameraVideo: HTMLVideoElement | null
  audioStream: MediaStream | null
  beautyEnabled: boolean
  beautySettings?: BeautySettings
  avatarEnabled?: boolean
  avatarStream?: MediaStream | null
  projectId?: string
}

// 便捷配置：只传帧尺寸
export interface RecordingFlowConfigWithFrameDims {
  frameWidth: number
  frameHeight: number
  cameraBubble: CameraBubbleState
  canvas: HTMLCanvasElement | null
  cameraVideo: HTMLVideoElement | null
  audioStream: MediaStream | null
  beautyEnabled: boolean
  beautySettings?: BeautySettings
  avatarEnabled?: boolean
  avatarStream?: MediaStream | null
  projectId?: string
}

export interface UseRecordingFlowReturn {
  // State
  state: RecordingState
  isPreviewing: boolean
  showPreview: boolean
  duration: number
  recordedBlob: Blob | null

  // Methods
  startPreview: (config: RecordingFlowConfig) => Promise<void>
  startPreviewWithFrameDims: (config: RecordingFlowConfigWithFrameDims) => Promise<void>
  cancelPreview: () => void
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<Blob | null>

  // 摄像框管理（委托给 useCanvasRecorder）
  setCameraBubbleState: (state: import("@/services/video/CanvasRecorder").CameraBubbleState) => void
}

export function useRecordingFlow(): UseRecordingFlowReturn {
  const {
    state: recorderState,
    duration,
    recordedBlob,
    startRecording: startCanvasRecording,
    stopRecording: stopCanvasRecording,
    pauseRecording: pauseCanvasRecording,
    resumeRecording: resumeCanvasRecording,
    setPreviewArea,
    setCameraBubbleState,
    setDemoCanvas,
    setCameraVideo,
    setAudioStream,
    setBeautySettings,
  } = useCanvasRecorder()

  const [isPreviewing, setIsPreviewing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // 进入预览状态并初始化录制基础设施
  const startPreview = useCallback(async (config: RecordingFlowConfig): Promise<void> => {
    // 设置预览区域
    setPreviewArea(config.previewArea)

    // 设置演示画布引用
    if (config.canvas) {
      setDemoCanvas(config.canvas)
    }

    // 设置摄像框状态
    setCameraBubbleState(config.cameraBubble)

    // 设置摄像头视频元素
    if (config.cameraVideo) {
      setCameraVideo(config.cameraVideo)
    }

    // 设置音频流
    setAudioStream(config.audioStream)

    // 应用美颜设置
    setBeautySettings(config.beautyEnabled, config.beautySettings)

    // 进入预览状态
    setIsPreviewing(true)
    setShowPreview(true)
  }, [setPreviewArea, setDemoCanvas, setCameraBubbleState, setCameraVideo, setAudioStream, setBeautySettings])

  // 传入帧尺寸自动计算 1.1x previewArea
  const startPreviewWithFrameDims = useCallback(async (config: RecordingFlowConfigWithFrameDims): Promise<void> => {
    // 内部计算 1.1x previewArea
    const previewArea: PreviewAreaState = {
      x: 0,
      y: 0,
      width: Math.round(config.frameWidth * 1.1),
      height: Math.round(config.frameHeight * 1.1),
    }

    // 摄像框尺寸也是 1.1x
    const cameraBubbleWithSize = {
      ...config.cameraBubble,
      size: {
        width: Math.round(config.frameWidth * 1.1),
        height: Math.round(config.frameHeight * 1.1),
      },
    }

    await startPreview({
      previewArea,
      cameraBubble: cameraBubbleWithSize,
      canvas: config.canvas,
      cameraVideo: config.cameraVideo,
      audioStream: config.audioStream,
      beautyEnabled: config.beautyEnabled,
      beautySettings: config.beautySettings,
      avatarEnabled: config.avatarEnabled,
      avatarStream: config.avatarStream,
      projectId: config.projectId,
    })
  }, [startPreview])

  // 取消预览回到空闲状态
  const cancelPreview = useCallback(() => {
    setIsPreviewing(false)
    setShowPreview(false)
  }, [])

  // 开始录制
  const startRecording = useCallback(async (): Promise<void> => {
    setIsPreviewing(false)
    setShowPreview(false)

    try {
      await startCanvasRecording()
    } catch (err) {
      console.error("Failed to start canvas recording:", err)
      throw err
    }

  }, [startCanvasRecording])

  // 暂停录制
  const pauseRecording = useCallback((): void => {
    pauseCanvasRecording()
  }, [pauseCanvasRecording])

  // 恢复录制
  const resumeRecording = useCallback((): void => {
    resumeCanvasRecording()
  }, [resumeCanvasRecording])

  // 停止录制，返回 blob（由调用方决定如何处理，不自动下载）
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    setShowPreview(false)
    const blob = await stopCanvasRecording()
    return blob
  }, [stopCanvasRecording])

  // 映射录制器状态到 RecordingState
  const state: RecordingState = recorderState === "idle" || recorderState === "stopped"
    ? "idle"
    : recorderState === "recording"
      ? "recording"
      : recorderState === "paused"
        ? "paused"
        : "idle"

  return {
    state,
    isPreviewing,
    showPreview,
    duration,
    recordedBlob,
    startPreview,
    cancelPreview,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setCameraBubbleState,
  }
}
