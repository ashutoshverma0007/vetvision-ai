import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSummary, VeterinarianProfile, UserRole } from '@vetvision/shared-types';
import { api } from '../lib/api';

interface AuthContextType {
  user: (UserSummary & { veterinarianProfile?: VeterinarianProfile | null }) | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: any) => Promise<{ email: string; requireOtp: boolean; cooldownSeconds: number; message: string }>;
  verifyOtp: (payload: { email: string; otp: string }) => Promise<void>;
  resendOtp: (payload: { email: string }) => Promise<{ email: string; cooldownSeconds: number; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(UserSummary & { veterinarianProfile?: VeterinarianProfile | null }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.auth.me();
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(credentials);
      setUser(res.user as any);
      // Fetch full profile including vet profile if available
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(payload);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (payload: { email: string; otp: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.verifyOtp(payload);
      setUser(res.user as any);
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (payload: { email: string }) => {
    return await api.auth.resendOtp(payload);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
