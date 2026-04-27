import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthApi } from '@/lib/api/auth.api';
import { TOKEN_KEY, api } from '@/lib/api/client';
import { useNavigate } from '@tanstack/react-router';

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || token === "null" || token === "undefined") {
        setUser(null);
        return;
      }
      
      const payloadBase64 = token.split('.')[1];
      const payloadDecoded = JSON.parse(atob(payloadBase64));
      const userId = payloadDecoded.sub;
      
      const response = await api.get(`/api/auth/users/${userId}`);
      if (response.data && response.data.data) {
        setUser(response.data.data);
      }
    } catch (error: any) {
      console.error("Failed to load user", error);
      // If user is deleted or token invalid, backend might return 404 or 401
      if (error.response?.status === 404 || error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        window.location.href = "/login";
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = () => {
    AuthApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
