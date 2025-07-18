import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserProfile, setUserInfo, findOrCreateUser } from './api'
import { auth as firebaseAuth, firestore } from './firebase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const defaultLocalUser: UserProfile = {
  uid: 'default_user',
  display_name: 'Default User',
  email: 'contact@pickle.com',
};

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<'local' | 'firebase' | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        console.log('🔥 Firebase mode activated:', firebaseUser.uid);
        setMode('firebase');

        let profile: UserProfile = {
          uid: firebaseUser.uid,
          display_name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || 'no-email@example.com',
        };

        try {

          const created = await findOrCreateUser(profile);

          // ✅ Always refetch from Firestore to get latest role or other metadata
          const snap = await getDoc(doc(firestore, 'users', created.uid));

          if (snap.exists()) {
            profile = snap.data() as UserProfile;
          }
          
          console.log('✅ Synced latest user data:', profile);
        } catch (error) {
          console.error('❌ Firestore user creation/verification failed:', error);
        }

        setUser(profile);
        setUserInfo(profile);
      } else {
        console.log('🏠 Local mode activated');
        setMode('local');

        setUser(defaultLocalUser);
        setUserInfo(defaultLocalUser);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [])

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