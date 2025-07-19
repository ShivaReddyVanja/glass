import { useEffect, useState } from 'react'
// Firebase imports removed - will use backend API instead
import { useAuth } from './auth'

export const useUserRole = () => {
  const { user, isLoading: authLoading } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      if (!user || !user.uid) return

      // TODO: Implement backend API call to get user role
      // For now, return null
      setRole(null)
      setLoading(false)
    }

    if (!authLoading && user) {
      fetchRole()
    }
  }, [user, authLoading])

  return { role, loading }
}
