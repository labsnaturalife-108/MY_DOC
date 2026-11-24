"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser, api, getAuthToken, setAuthToken, clearAuthToken } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const me = await api.getMe();
        if (active) setUser(me);
      } catch {
        clearAuthToken();
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener("mydoc:unauthorized", handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener("mydoc:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setAuthToken(res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await api.register({ email, password, full_name: fullName });
    setAuthToken(res.access_token);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
