// CanvasRecorder - 将演示画布和摄像框合成为视频

import { BeautyFilter, type BeautySettings } from "@/services/beauty/BeautyFilter"

export interface CameraBubbleState {
  stream: MediaStream | null
  position: { x: number; y: number }
  size: { width: number; height: number }
  shape: "rounded-rect" | "circle" | "pill"
  borderRadius: number
  borderColor: string
  borderWidth: number
}

export interface PreviewAreaState {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasRecorderOptions {
  fps?: number
  mimeType?: string
  previewArea?: PreviewAreaState
}

export class CanvasRecorder {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private animationId: number | null = null
  private isRecording = false
  private fps: number
  private mimeType: string

  // 待合成的画布元素
  private demoCanvas: HTMLCanvasElement | null = null
  private cameraBubble: CameraBubbleState | null = null
  private cameraVideo: HTMLVideoElement | null = null
  private audioStream: MediaStream | null = null

  // 美颜滤镜
  private beautyFilter: BeautyFilter | null = null
  private beautyEnabled = false
  private beautySettings: BeautySettings = {
    smoothing: 30,
    whitening: 20,
    faceSlimming: 0,
    skinTone: 50,
  }
  private beautyCanvas: OffscreenCanvas | null = null

  // 预览区域配置
  private previewArea: PreviewAreaState = { x: 0, y: 0, width: 1280, height: 720 }

  constructor(options: CanvasRecorderOptions = {}) {
    this.fps = options.fps || 30
    this.mimeType = options.mimeType || "video/webm;codecs=vp9"
    if (options.previewArea) {
      this.previewArea = options.previewArea
    }
  }

  // 初始化录制器
  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
  }

  // 设置预览区域
  setPreviewArea(area: PreviewAreaState): void {
    this.previewArea = area
    // 需要时重新创建美颜画布
    if (this.beautyEnabled) {
      this.beautyCanvas = new OffscreenCanvas(area.width, area.height)
    }
  }

  // 设置演示画布元素
  setDemoCanvas(canvas: HTMLCanvasElement | null): void {
    this.demoCanvas = canvas
  }

  // 设置摄像框状态
  setCameraBubble(state: CameraBubbleState | null): void {
    this.cameraBubble = state
  }

  // 设置摄像视频元素
  setCameraVideo(video: HTMLVideoElement | null): void {
    this.cameraVideo = video
  }

  // 设置音频流（独立于摄像框）
  setAudioStream(stream: MediaStream | null): void {
    this.audioStream = stream
  }

  // 设置美颜参数
  setBeautySettings(enabled: boolean, settings?: BeautySettings): void {
    this.beautyEnabled = enabled
    if (settings) {
      this.beautySettings = settings
    }
    if (enabled && !this.beautyFilter) {
      this.beautyFilter = new BeautyFilter(this.previewArea.width, this.previewArea.height)
      this.beautyCanvas = new OffscreenCanvas(this.previewArea.width, this.previewArea.height)
    }
  }

  // 开始录制
  async start(): Promise<void> {
    if (this.isRecording) {
      return
    }

    if (!this.canvas) {
      throw new Error("CanvasRecorder: Canvas not initialized")
    }

    this.chunks = []

    // 从画布创建流
    const canvasStream = this.canvas.captureStream(this.fps)

    // 检查是否有音频轨
    const hasAudio = (this.cameraBubble?.stream?.getAudioTracks().length ?? 0) > 0 ||
                     (this.audioStream?.getAudioTracks().length ?? 0) > 0

    // 尝试添加摄像头音频轨
    if (this.cameraBubble?.stream) {
      const audioTracks = this.cameraBubble.stream.getAudioTracks()
      audioTracks.forEach((track) => {
        canvasStream.addTrack(track)
      })
    }

    // 添加独立麦克风音频流
    if (this.audioStream) {
      const audioTracks = this.audioStream.getAudioTracks()
      audioTracks.forEach((track) => {
        canvasStream.addTrack(track)
      })
    }

    // 记录流中的所有轨道

    // 确定支持的 MIME 类型 - 有音频时优先 WebM
    let mimeType = ""

    // 有音频时优先 WebM VP9（音频支持更好）
    if (hasAudio) {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9"
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm"
      }
    }

    // 无音频或不支持 WebM 时，尝试 MP4
    if (!mimeType) {
      // 先尝试 MP4（Safari 原生支持）
      if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4"
      }
      // 尝试 WebM VP9
      else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9"
      }
      // 回退到基础 WebM
      else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm"
      } else {
      }
    } else {
    }

    this.mimeType = mimeType // Store actual mimeType used
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {}

    this.mediaRecorder = new MediaRecorder(canvasStream, options)

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data)
      }
    }

    this.mediaRecorder.start(100) // 每 100ms 收集数据
    this.isRecording = true

    // 启动合成渲染循环
    this.startRenderLoop()
  }

  // 停止录制并返回录制的 Blob
  async stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null)
        return
      }

      this.stopRenderLoop()

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || "video/webm" })
        this.isRecording = false
        resolve(blob)
      }

      this.mediaRecorder.stop()
    })
  }

  // 暂停录制
  pause(): void {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.pause()
      this.stopRenderLoop()
    }
  }

  // 恢复录制
  resume(): void {
    if (this.mediaRecorder?.state === "paused") {
      this.mediaRecorder.resume()
      if (this.cameraBubble) {
        this.startRenderLoop()
      }
    }
  }

  // 获取当前录制状态
  getState(): "inactive" | "recording" | "paused" | "stopped" {
    return this.mediaRecorder?.state || "inactive"
  }

  // 启动渲染循环，合成画布和摄像框
  private startRenderLoop(): void {
    // 使用 setInterval 保持帧率稳定
    const intervalMs = 1000 / this.fps

    const intervalId = setInterval(() => {
      if (this.isRecording) {
        this.compositeFrame()
      }
    }, intervalMs)

    // 存储清理函数
    this.animationId = intervalId as unknown as number
  }

  // 停止渲染循环
  private stopRenderLoop(): void {
    if (this.animationId !== null) {
      clearInterval(this.animationId as unknown as ReturnType<typeof setInterval>)
      this.animationId = null
    }
  }

  // 将演示画布和摄像框合成到录制画布
  private compositeFrame(): void {
    if (!this.ctx || !this.canvas) return

    const { width, height } = this.previewArea

    // 清空画布
    this.ctx.fillStyle = "#fafafa"
    this.ctx.fillRect(0, 0, width, height)

    // 绘制演示画布（缩放适配预览区域）
    if (this.demoCanvas) {
      try {
        // 等比缩放以适配预览区域
        const sourceWidth = this.demoCanvas.width || 1920
        const sourceHeight = this.demoCanvas.height || 1080
        const targetWidth = width
        const targetHeight = height

        // 计算 cover 模式缩放比
        const scaleX = targetWidth / sourceWidth
        const scaleY = targetHeight / sourceHeight
        const scale = Math.max(scaleX, scaleY) // Use cover mode

        const scaledWidth = sourceWidth * scale
        const scaledHeight = sourceHeight * scale
        const offsetX = (targetWidth - scaledWidth) / 2
        const offsetY = (targetHeight - scaledHeight) / 2

        this.ctx.drawImage(
          this.demoCanvas,
          offsetX,
          offsetY,
          scaledWidth,
          scaledHeight
        )
      } catch (e) {
      }
    }

    // 绘制摄像框（如果可用且有视频）
    if (this.cameraBubble && this.cameraVideo && this.cameraVideo.readyState >= 2) {
      const { position, size, shape, borderRadius, borderColor, borderWidth } = this.cameraBubble
      const { x, y } = position
      const { width: bw, height: bh } = size

      this.ctx.save()

      // 应用边框和阴影
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.15)"
      this.ctx.shadowBlur = 12
      this.ctx.shadowOffsetX = 0
      this.ctx.shadowOffsetY = 4

      // 绘制边框
      this.ctx.strokeStyle = borderColor
      this.ctx.lineWidth = borderWidth

      // 按形状裁剪
      this.ctx.beginPath()
      switch (shape) {
        case "circle":
          this.ctx.ellipse(x + bw / 2, y + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2)
          break
        case "pill":
          this.ctx.roundRect(x, y, bw, bh, bh / 2)
          break
        default:
          this.ctx.roundRect(x, y, bw, bh, borderRadius)
      }
      this.ctx.stroke()

      // 重置视频阴影
      this.ctx.shadowColor = "transparent"

      // 裁剪并绘制视频
      this.ctx.beginPath()
      switch (shape) {
        case "circle":
          this.ctx.ellipse(x + bw / 2, y + bh / 2, (bw - borderWidth * 2) / 2, (bh - borderWidth * 2) / 2, 0, 0, Math.PI * 2)
          break
        case "pill":
          this.ctx.roundRect(x + borderWidth, y + borderWidth, bw - borderWidth * 2, bh - borderWidth * 2, (bh - borderWidth * 2) / 2)
          break
        default:
          this.ctx.roundRect(x + borderWidth, y + borderWidth, bw - borderWidth * 2, bh - borderWidth * 2, borderRadius)
      }
      this.ctx.clip()

      // 绘制视频（水平翻转实现镜像）
      this.ctx.scale(-1, 1)

      // 启用美颜时应用滤镜
      if (this.beautyEnabled && this.beautyFilter && this.beautyCanvas) {
        const tempCtx = this.beautyCanvas.getContext("2d")
        if (tempCtx) {
          // 将视频绘制到临时画布（镜像）
          tempCtx.save()
          tempCtx.scale(-1, 1)
          tempCtx.drawImage(this.cameraVideo, -bw, 0, bw, bh)
          tempCtx.restore()

          // 获取图像数据并应用美颜
          const imageData = tempCtx.getImageData(0, 0, bw, bh)
          const processedData = this.beautyFilter.applyBeautyFilter(imageData, this.beautySettings)

          // 写回处理后的数据
          tempCtx.putImageData(processedData, 0, 0)

          // 绘制处理后的画布（镜像已在 tempCtx 中处理）
          this.ctx.save()
          this.ctx.scale(-1, 1)
          this.ctx.drawImage(this.beautyCanvas, -x - bw, y, bw, bh)
          this.ctx.restore()
          this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        } else {
          this.ctx.drawImage(this.cameraVideo, -x - bw, y, bw, bh)
          this.ctx.setTransform(1, 0, 0, 1, 0, 0)
        }
      } else {
        this.ctx.drawImage(this.cameraVideo, -x - bw, y, bw, bh)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      }

      this.ctx.restore()
    }
  }

  // 清理资源
  destroy(): void {
    this.stopRenderLoop()
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }
    this.mediaRecorder = null
    this.stream = null
    this.canvas = null
    this.ctx = null
    this.demoCanvas = null
    this.cameraBubble = null
    this.cameraVideo = null
  }
}

export const canvasRecorder = new CanvasRecorder()
