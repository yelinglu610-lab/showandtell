// Auth 上下文（已简化，无外部依赖）
import { createContext, useContext, type ReactNode } from "react"

interface User {
  id: string
  email?: string
  fullName?: string
  avatarUrl?: string
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
