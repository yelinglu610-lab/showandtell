import type { ReactNode } from "react"

interface MainLayoutProps {
  header: ReactNode
  canvas: ReactNode
  rightPanel?: ReactNode
}

export function MainLayout({ header, canvas, rightPanel }: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {header}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-hidden">{canvas}</div>
        {rightPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-background/95 backdrop-blur-sm border-l overflow-y-auto z-20">
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  )
}
