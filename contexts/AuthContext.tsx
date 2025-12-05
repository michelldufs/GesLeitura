import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch extended profile with Role
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Fallback for demo if user doc doesn't exist
            setUserProfile({
              uid: currentUser.uid,
              name: currentUser.email || 'User',
              email: currentUser.email || '',
              role: 'admin',
              allowedLocalidades: [],
              active: true
            });
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    // 1. Standard Firebase Login
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // 2. Device Binding Check (Mobile Only)
    try {
      // Dynamic import to avoid issues in non-Capacitor environments if packages are missing
      const { Capacitor } = await import('@capacitor/core');
      const { Device } = await import('@capacitor/device');

      if (Capacitor.isNativePlatform()) {
        const deviceId = await Device.getId();
        // @ts-ignore - Capacitor types might vary by version
        const currentUuid = deviceId.uuid || deviceId.identifier;

        // Fetch fresh user profile to check restrictions
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          const allowedSerial = userData.allowedDeviceSerial;

          if (allowedSerial && allowedSerial !== currentUuid) {
            await signOut(auth); // Force logout
            throw new Error(`Acesso negado. Este dispositivo (${currentUuid}) não está autorizado.`);
          }
        }
      }
    } catch (error: any) {
      console.error("Device verification failed", error);
      // If it's our security error, rethrow it
      if (error.message && error.message.includes('Acesso negado')) {
        throw error;
      }
      // Otherwise, we might choose to allow or block. 
      // For safety, let's log but allow if it's just a plugin error (e.g. running in web with partial mock)
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('selectedLocalidade');
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};