import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface UserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (credential: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('google_auth_token');
    if (token) {
      try {
        const decoded = jwtDecode<UserProfile>(token);
        // Basic check if token is expired (if 'exp' is available)
        const exp = (decoded as any).exp;
        if (exp && exp * 1000 < Date.now()) {
          localStorage.removeItem('google_auth_token');
          setUser(null);
        } else {
          setUser(decoded);
        }
      } catch (e) {
        console.error("Invalid token in local storage", e);
        localStorage.removeItem('google_auth_token');
      }
    }
  }, []);

  const login = (credential: string) => {
    try {
      const decoded = jwtDecode<UserProfile>(credential);
      localStorage.setItem('google_auth_token', credential);
      setUser(decoded);
    } catch (e) {
      console.error("Failed to decode JWT on login", e);
    }
  };

  const logout = () => {
    localStorage.removeItem('google_auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
