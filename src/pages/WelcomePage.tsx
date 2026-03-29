// 欢迎页：小鹿风格，介绍 ShowAndTell 功能
import { useState } from "react"

interface WelcomePageProps {
  onStart: (url?: string) => void
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  const [url, setUrl] = useState("")

  const handleStart = () => {
    let finalUrl = url.trim()
    if (finalUrl && !finalUrl.startsWith("http")) finalUrl = "https://" + finalUrl
    if (finalUrl) window.open(finalUrl, "_blank")
    onStart(finalUrl)
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #FFD600 0%, #FFFDE7 45%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "40px 24px",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "#4E342E",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 8px 24px rgba(78,52,46,0.25)",
        }}>
          <span style={{ fontSize: 36 }}>🎬</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#4E342E", margin: 0, letterSpacing: -1 }}>
          ShowAndTell
        </h1>
        <p style={{ fontSize: 16, color: "#795548", marginTop: 8, fontWeight: 500 }}>
          把想法变成演示
        </p>
      </div>

      {/* 功能卡片 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        maxWidth: 720,
        width: "100%",
        marginBottom: 40,
      }}>
        {[
          { icon: "📹", title: "摄像框", desc: "拖动、缩放、圆角、美颜，随心调整" },
          { icon: "🖊", title: "画笔", desc: "在屏幕上直接画线写字，清晰表达" },
          { icon: "🔴", title: "激光笔", desc: "高亮重点，移动后自动消失" },
          { icon: "🖼", title: "插入图片", desc: "把图片浮在屏幕上展示，可拖动" },
          { icon: "✨", title: "美颜", desc: "磨皮美白，录出来也好看" },
          { icon: "⏺", title: "一键录制", desc: "录完即可下载或导出 mp4" },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 16px",
            boxShadow: "0 2px 12px rgba(78,52,46,0.08)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#4E342E", marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#795548", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* URL 输入 + 开始按钮 */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "24px 28px",
        boxShadow: "0 4px 24px rgba(78,52,46,0.12)",
        width: "100%",
        maxWidth: 520,
        marginBottom: 16,
      }}>
        <p style={{ fontSize: 13, color: "#795548", marginBottom: 10, fontWeight: 600 }}>
          输入你要演示的网页（可选）
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleStart() }}
            placeholder="https://xiaolu-site.pages.dev"
            style={{
              flex: 1, height: 44, borderRadius: 10,
              border: "1.5px solid #e0d5c8", padding: "0 14px",
              fontSize: 14, outline: "none", color: "#4E342E",
              background: "#FFFDE7",
            }}
          />
          <button
            onClick={handleStart}
            style={{
              height: 44, padding: "0 24px",
              background: "#4E342E", color: "#FFD600",
              border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            开始演示 →
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>
          网页会在新标签打开，ShowAndTell 工具栏悬浮在上面
        </p>
      </div>

      <p style={{ fontSize: 13, color: "#795548" }}>
        零登录 · 零账号 · 本地运行
      </p>
    </div>
  )
}
