import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileService } from '../services/mobileService';

export interface MobileUser {
  id: string;
  email: string;
  name: string;
}

interface MobileAuthContextType {
  user: MobileUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const MobileAuthContext = createContext<MobileAuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOKEN: 'auth69mob_auth_token',
  USER: 'auth69mob_auth_user',
};

export const MobileAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check saved session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        const savedUserStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        if (savedToken && savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          setToken(savedToken);
          setUser(parsedUser);
        }
      } catch (err) {
        console.warn('[MobileAuthContext] Could not restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await mobileService.login(email, password);
    const user = data?.user || (data?.email ? data : null);
    const token = data?.token;
    if (token && user) {
      const mobileUser: MobileUser = {
        id: user.id || user._id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
      };
      setToken(token);
      setUser(mobileUser);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mobileUser));
    } else {
      throw new Error(data?.message || 'Login failed: missing user or token in response');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await mobileService.register(email, password, name);
    const user = data?.user || (data?.email ? data : null);
    const token = data?.token;
    if (token && user) {
      const mobileUser: MobileUser = {
        id: user.id || user._id,
        email: user.email,
        name: user.name || name || user.email.split('@')[0],
      };
      setToken(token);
      setUser(mobileUser);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mobileUser));
    } else {
      throw new Error(data?.message || 'Registration failed: missing user or token in response');
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  };

  return (
    <MobileAuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  );
};

export const useMobileAuth = () => {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within a MobileAuthProvider');
  }
  return context;
};
