import { useSession, signIn, signOut, getSession } from 'next-auth/react'
import { UserProfile, setUserInfo, findOrCreateUser } from './api'

const defaultLocalUser: UserProfile = {
  id: 'default_user',
  uid: 'default_user',
  display_name: 'Default User',
  email: 'contact@pickle.com',
};

export const useNextAuth = () => {
  const { data: session, status, update } = useSession()
  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  const user: UserProfile | null = session?.user ? {
    id: session.userId || 'unknown',
    uid: session.userId || 'unknown',
    display_name: session.user.name || 'User',
    email: session.user.email || 'no-email@example.com',
  } : null

  return {
    user,
    isLoading,
    isAuthenticated,
    session,
    update
  }
}

export const useAuth = () => {
  const { user, isLoading, isAuthenticated, session } = useNextAuth()
  const mode = isAuthenticated ? 'firebase' : 'local' // Keep 'firebase' for compatibility

  // Set user info for compatibility with existing code
  if (user && isAuthenticated) {
    setUserInfo(user)
  } else if (!isLoading) {
    setUserInfo(defaultLocalUser)
  }

  return { 
    user: user || defaultLocalUser, 
    isLoading, 
    mode 
  }
}

export const useRedirectIfNotAuth = () => {
  const { user, isLoading } = useAuth()
  return user
}

export const signInWithGoogle = async () => {
  try {
    const result = await signIn('google', { 
      callbackUrl: '/settings',
      redirect: false 
    })
    return result
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

export const getCurrentSession = async () => {
  try {
    return await getSession()
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
} 