import { useState } from "react"
import { Button } from "@/components/ui"
import type { ExportFormat } from "@/types"

interface ExportDialogProps {
  isOpen: boolean
  isExporting: boolean
  progress: number
  onExport: (format: ExportFormat) => void
  onClose: () => void
}

const EXPORT_FORMATS: { format: ExportFormat; label: string; description: string }[] = [
  {
    format: "mp4",
    label: "MP4 (H.264)",
    description: "兼容性最佳，文件较小",
  },
  {
    format: "webm",
    label: "WebM (VP9)",
    description: "高质量，现代浏览器支持",
  },
  {
    format: "gif",
    label: "GIF",
    description: "动图，无音频",
  },
]

export function ExportDialog({
  isOpen,
  isExporting,
  progress,
  onExport,
  onClose,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("mp4")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">导出视频</h2>

        {!isExporting ? (
          <>
            <div className="space-y-2 mb-6">
              {EXPORT_FORMATS.map((item) => (
                <label
                  key={item.format}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFormat === item.format
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={item.format}
                    checked={selectedFormat === item.format}
                    onChange={() => setSelectedFormat(item.format)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  {selectedFormat === item.format && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                取消
              </Button>
              <Button onClick={() => onExport(selectedFormat)} className="flex-1">
                导出
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">{progress}%</div>
              <div className="text-sm text-muted-foreground">正在导出视频...</div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Button variant="outline" onClick={onClose} className="w-full">
              取消
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
