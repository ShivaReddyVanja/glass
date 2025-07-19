import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, setUserInfo, findOrCreateUser } from './api'
import { useSession, signIn, signOut } from 'next-auth/react'

const defaultLocalUser: UserProfile = {
  id: 'default_user',
  uid: 'default_user',
  display_name: 'Default User',
  email: 'contact@pickle.com',
};

export const useAuth = () => {
  const { data: session, status } = useSession()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<'local' | 'firebase' | null>(null)

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true)
      return
    }

    if (session?.user) {
      //@ts-ignore
      console.log('🔥 NextAuth mode activated:', session.userId || session.user.id);
      setMode('firebase'); // Keep 'firebase' for compatibility
      //@ts-ignore
      let profile: UserProfile = {
        //@ts-ignore
        uid: session.userId || session.user.id || 'unknown',
        display_name: session.user.name || 'User',
        email: session.user.email || 'no-email@example.com',
      };

      // Set user info for compatibility with existing code
      setUserInfo(profile);
      setUser(profile);
      console.log('✅ Synced latest user data:', profile);
    } else {
      console.log('🏠 Local mode activated');
      setMode('local');

      setUser(defaultLocalUser);
      setUserInfo(defaultLocalUser);
    }
    setIsLoading(false);
  }, [session, status])

  return { user, isLoading, mode }
}

export const useRedirectIfNotAuth = () => {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // This hook is now simplified. It doesn't redirect for local mode.
    // If you want to force login for hosting mode, you'd add logic here.
    // For example: if (!isLoading && !user) router.push('/login');
    // But for now, we allow both modes.
  }, [user, isLoading, router])

  return user
}

// Export NextAuth functions for compatibility
export const signInWithGoogle = async () => {
  try {
    return await signIn('google', { 
      callbackUrl: '/settings',
      redirect: false 
    })
  } catch (error) {
    console.error('Google sign-in failed:', error)
    throw error
  }
}

export const signOutUser = async () => {
  try {
    await signOut({ redirect: false })
  } catch (error) {
    console.error('Sign out failed:', error)
    throw error
  }
} 