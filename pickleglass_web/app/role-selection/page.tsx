'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { firestore } from '@/utils/firebase'
import { Suspense, useEffect, useState } from 'react'
import { getAuth } from 'firebase/auth'

function RoleSelection() {
  const router = useRouter()
  const params = useSearchParams()

  const paramUid = params.get('uid')
  const email = params.get('email')
  const displayName = params.get('displayName')
  const token = params.get('token')
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const uid = paramUid || getAuth().currentUser?.uid || null

  useEffect(() => {
    const fetchRole = async () => {
      if (!uid || paramUid) {
        setIsLoading(false)
        return
      }

      try {
        const docRef = doc(firestore, 'users', uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setCurrentRole(docSnap.data().role || null)
        }
      } catch (err) {
        console.error('❌ Failed to fetch role:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRole()
  }, [uid, paramUid])

  const handleRoleSelect = async (role: 'interviewer' | 'interviewee') => {
    if (!uid) return

    await setDoc(doc(firestore, 'users', uid), {
      role,
      email,
      displayName,
      updatedAt: Date.now(),
    }, { merge: true })

    setCurrentRole(role)

    if (paramUid) {
      const deepLinkUrl = `pickleglass://auth-success?` + new URLSearchParams({
        uid: uid || '',
        email: email || '',
        displayName: displayName || '',
        token: token || '',
        role
      }).toString()

      console.log('🔗 Deep linking to:', deepLinkUrl)
      window.location.href = deepLinkUrl
    }
  }

  if (isLoading) return <div>Loading...</div>

  const baseButton = 'px-6 py-2 rounded border'
  const activeButton = 'bg-black text-white border-black'
  const inactiveButton = 'bg-white text-black border-gray-400'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-6">Choose your role</h1>
      <div className="space-x-4">
        <button
          onClick={() => handleRoleSelect('interviewer')}
          className={`${baseButton} ${currentRole === 'interviewer' ? activeButton : inactiveButton}`}
        >
          Interviewer
        </button>
        <button
          onClick={() => handleRoleSelect('interviewee')}
          className={`${baseButton} ${currentRole === 'interviewee' ? activeButton : inactiveButton}`}
        >
          Interviewee
        </button>
      </div>
    </div>
  )
}

export default function RolePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RoleSelection />
    </Suspense>
  )
}
