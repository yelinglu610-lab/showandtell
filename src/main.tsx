import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { AuthProvider, ThemeProvider } from "./contexts"

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
)
