import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { getClientAuth } from '../lib/firebase';
import { UserProfile } from '../types';
import api from '../lib/api';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const response = await api.get<{ profile: UserProfile }>(`/users/${uid}`);
      setUserProfile(response.data.profile);
    } catch (err) {
      console.error('Failed to fetch user profile, creating standard/fallback profile.', err);
      // Fallback local profile if backend isn't populated or running
      setUserProfile({
        uid,
        name: currentUser?.displayName || 'Zenit Member',
        displayName: currentUser?.displayName || 'Zenit Member',
        email: currentUser?.email || 'user@zenitsmm.com',
        phone: '',
        role: 'User', // Default
        balance: 0.00, // starting wallet balance of 0.00
        totalSpent: 0,
        totalOrders: 0,
        status: 'Active',
        emailVerified: currentUser?.emailVerified || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const refreshProfile = async () => {
    // Check if we have an active firebase user
    const auth = getClientAuth();
    if (auth.currentUser) {
      await fetchProfile(auth.currentUser.uid);
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const auth = getClientAuth();
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          await fetchProfile(user.uid);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
    } catch (e) {
      console.warn('Firebase auth initialization failed or skipped due to missing credentials.', e);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      const auth = getClientAuth();
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const isAdmin = userProfile?.role === 'Admin' || userProfile?.role === 'Super Admin' || userProfile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export default AuthProvider;
