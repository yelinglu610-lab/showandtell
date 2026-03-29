// 欢迎页：小鹿风格，介绍 ShowAndTell 功能
interface WelcomePageProps {
  onStart: () => void
}

export function WelcomePage({ onStart }: WelcomePageProps) {
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

      {/* 开始按钮 */}
      <button
        onClick={onStart}
        style={{
          background: "#4E342E",
          color: "#FFD600",
          border: "none",
          borderRadius: 14,
          padding: "16px 48px",
          fontSize: 18,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(78,52,46,0.3)",
          transition: "transform 0.15s, box-shadow 0.15s",
          letterSpacing: 0.5,
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.transform = "translateY(-2px)"
          ;(e.target as HTMLElement).style.boxShadow = "0 8px 24px rgba(78,52,46,0.35)"
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.transform = "translateY(0)"
          ;(e.target as HTMLElement).style.boxShadow = "0 4px 16px rgba(78,52,46,0.3)"
        }}
      >
        开始演示 →
      </button>

      <p style={{ marginTop: 16, fontSize: 13, color: "#795548" }}>
        零登录 · 零账号 · 本地运行
      </p>
    </div>
  )
}
