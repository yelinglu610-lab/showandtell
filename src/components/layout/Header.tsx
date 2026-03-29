// 顶部工具栏
import { useState } from "react"
import { Button } from "@/components/ui"
import { APP_NAME } from "@/lib/constants"

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0")
  const m = date.getMinutes().toString().padStart(2, "0")
  const s = date.getSeconds().toString().padStart(2, "0")
  return `${h}:${m}:${s}`
}

interface HeaderProps {
  projectName?: string
  onProjectNameChange?: (name: string) => void
  onTogglePanel?: () => void
  panelVisible?: boolean
  languageSelector?: React.ReactNode
  themeToggle?: React.ReactNode
  onSave?: () => void
  lastSavedAt?: Date | null
  isSaving?: boolean
  onAddWebWidget?: () => void
  onAddFileWidget?: () => void
}

export function Header({
  projectName,
  onProjectNameChange,
  onTogglePanel,
  panelVisible,
  languageSelector,
  themeToggle,
  onSave,
  lastSavedAt,
  isSaving,
  onAddWebWidget,
  onAddFileWidget,
}: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(projectName || "")
  const [showSaveTooltip, setShowSaveTooltip] = useState(false)

  const handleStartEdit = () => {
    setEditName(projectName || "")
    setIsEditing(true)
  }

  const handleSaveName = () => {
    if (editName.trim()) onProjectNameChange?.(editName.trim())
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName()
    else if (e.key === "Escape") setIsEditing(false)
  }

  return (
    <header className="h-12 border-b bg-background flex items-center justify-between px-4">
      {/* 左：Logo + 项目名 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-semibold text-sm">{APP_NAME}</span>
        </div>

        {projectName !== undefined && (
          <>
            <span className="text-border">|</span>
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-sm bg-background border border-input rounded px-2 py-1 outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <span
                onClick={handleStartEdit}
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                title="点击编辑"
              >
                {projectName}
              </span>
            )}
          </>
        )}
      </div>

      {/* 右：操作按钮 */}
      <div className="flex items-center gap-1">
        {languageSelector}
        {themeToggle}

        {/* 嵌入网页 */}
        {onAddWebWidget && (
          <Button variant="ghost" size="sm" onClick={onAddWebWidget} className="gap-1.5 text-xs h-8 px-3">
            <span>🌐</span>
            <span>网页</span>
          </Button>
        )}

        {/* 上传文件 */}
        {onAddFileWidget && (
          <Button variant="ghost" size="sm" onClick={onAddFileWidget} className="gap-1.5 text-xs h-8 px-3">
            <span>📎</span>
            <span>文件</span>
          </Button>
        )}

        {/* 保存 */}
        {onSave && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onSave()
                setShowSaveTooltip(true)
                setTimeout(() => setShowSaveTooltip(false), 2000)
              }}
              disabled={isSaving}
              title={lastSavedAt ? `已保存 ${formatTime(lastSavedAt)}` : "保存"}
            >
              {isSaving ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
            </Button>
            {showSaveTooltip && lastSavedAt && (
              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap z-50">
                已保存 {formatTime(lastSavedAt)}
              </div>
            )}
          </div>
        )}

        {/* 摄像框/美颜设置面板 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePanel}
          title={panelVisible ? "收起" : "摄像框 & 美颜"}
          className={panelVisible ? "bg-accent" : ""}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </Button>
      </div>
    </header>
  )
}
