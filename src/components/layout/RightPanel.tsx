// 右侧设置面板：媒体设备、画面比例、摄像框、美颜
import { BeautyPanel } from "@/components/beauty/BeautyPanel"
import { CameraBubbleSettings, type BubbleShape } from "@/components/canvas/CameraBubbleSettings"
import type { BeautySettings } from "@/services/beauty/BeautyFilter"

export interface RightPanelProps {
  // 美颜
  beautyEnabled: boolean
  beautySettings: BeautySettings
  onBeautySettingChange: <K extends keyof BeautySettings>(key: K, value: BeautySettings[K]) => void
  onBeautyToggle: () => void
  onBeautyReset: () => void
  // 摄像框
  cameraBubbleShape?: BubbleShape
  cameraBubbleBorderColor?: string
  cameraBubbleBorderWidth?: number
  cameraBubbleBorderRadius?: number
  cameraBubbleSize?: { width: number; height: number }
  onCameraBubbleShapeChange?: (shape: BubbleShape) => void
  onCameraBubbleBorderColorChange?: (color: string) => void
  onCameraBubbleBorderWidthChange?: (width: number) => void
  onCameraBubbleBorderRadiusChange?: (radius: number) => void
  onCameraBubbleSizeChange?: (size: { width: number; height: number }) => void
  onCameraBubblePositionPreset?: (position: { x: number; y: number }) => void
  // 媒体设备
  cameraEnabled?: boolean
  micEnabled?: boolean
  onCameraToggle?: () => void
  onMicToggle?: () => void
}

export function RightPanel({
  beautyEnabled,
  beautySettings,
  onBeautySettingChange,
  onBeautyToggle,
  onBeautyReset,
  cameraBubbleShape = "rounded-rect",
  cameraBubbleBorderColor = "#ffffff",
  cameraBubbleBorderWidth = 3,
  cameraBubbleBorderRadius = 16,
  cameraBubbleSize = { width: 200, height: 150 },
  onCameraBubbleShapeChange,
  onCameraBubbleBorderColorChange,
  onCameraBubbleBorderWidthChange,
  onCameraBubbleBorderRadiusChange,
  onCameraBubbleSizeChange,
  onCameraBubblePositionPreset,
  cameraEnabled = true,
  micEnabled = true,
  onCameraToggle,
  onMicToggle,
}: RightPanelProps) {
  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h2 className="font-semibold">录制设置</h2>
      </div>

      {/* 媒体设备 */}
      {onCameraToggle && onMicToggle && (
        <section>
          <h3 className="font-semibold text-sm mb-4">媒体设备</h3>
          <div className="flex gap-2">
            <button
              onClick={onCameraToggle}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                cameraEnabled
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={cameraEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              摄像头
            </button>
            <button
              onClick={onMicToggle}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                micEnabled
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={micEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              麦克风
            </button>
          </div>
        </section>
      )}

      {/* 摄像框设置 */}
      {onCameraBubbleShapeChange && onCameraBubbleBorderColorChange && (
        <section>
          <CameraBubbleSettings
            shape={cameraBubbleShape}
            borderColor={cameraBubbleBorderColor}
            borderWidth={cameraBubbleBorderWidth}
            borderRadius={cameraBubbleBorderRadius}
            size={cameraBubbleSize}
            onShapeChange={onCameraBubbleShapeChange}
            onBorderColorChange={onCameraBubbleBorderColorChange}
            onBorderWidthChange={onCameraBubbleBorderWidthChange}
            onBorderRadiusChange={onCameraBubbleBorderRadiusChange}
            onSizeChange={onCameraBubbleSizeChange!}
            onPositionPreset={onCameraBubblePositionPreset!}
          />
        </section>
      )}

      {/* 美颜 */}
      <section>
        <BeautyPanel
          settings={beautySettings}
          isEnabled={beautyEnabled}
          onSettingChange={onBeautySettingChange}
          onToggle={onBeautyToggle}
          onReset={onBeautyReset}
        />
      </section>
    </div>
  )
}
