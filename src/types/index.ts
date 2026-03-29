// 核心类型定义

export type RecordingState = 'idle' | 'countdown' | 'previewing' | 'recording' | 'paused' | 'stopped'

export type ExportFormat = 'mp4' | 'webm' | 'gif'

export interface ExportOptions {
  format: ExportFormat
  quality: 'low' | 'medium' | 'high' | 'ultra'
  fps: number
  width?: number
  height?: number
  startTime?: number
  endTime?: number
}
