import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('corehr_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('corehr_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(res => { setUser(res.data); localStorage.setItem('corehr_user', JSON.stringify(res.data)) })
      .catch(() => { localStorage.removeItem('corehr_token'); localStorage.removeItem('corehr_user') })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    localStorage.setItem('corehr_token', res.data.token)
    localStorage.setItem('corehr_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('corehr_token')
    localStorage.removeItem('corehr_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
