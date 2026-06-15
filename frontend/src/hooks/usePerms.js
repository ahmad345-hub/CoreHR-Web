import { useAuth } from '../context/AuthContext'

export function usePerms() {
  const { user } = useAuth()
  const perms = user?.permissions || {}
  const isSuperuser = !!user?.is_superuser

  // Check if user has a specific permission
  const can = (key) => isSuperuser || perms[key] === true

  return { can, perms, isSuperuser }
}
