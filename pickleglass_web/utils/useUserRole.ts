import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/utils/firebase'
import { useAuth } from './auth'

export const useUserRole = () => {
  const { user, isLoading: authLoading } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      if (!user || !user.uid) return

      const userDoc = await getDoc(doc(firestore, 'users', user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setRole(data.role || null)
      }
      setLoading(false)
    }

    if (!authLoading && user) {
      fetchRole()
    }
  }, [user, authLoading])

  return { role, loading }
}
