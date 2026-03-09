"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  userId: number;
  dingtalkUserId: string;
  name: string;
  avatar?: string;
  email?: string;
  isLoggedIn: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  ssoEnabled: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = "dingtalk_auth_cache";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week

function getLocalStorageUser(): User | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { user, expiry } = JSON.parse(cached);
    if (Date.now() > expiry) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function saveLocalStorageUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ user, expiry: Date.now() + CACHE_DURATION })
      );
    } else {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/auth/config");
      if (response.ok) {
        const config = await response.json();
        setSsoEnabled(config.ssoEnabled);
      }
    } catch (error) {
      console.error("Failed to fetch auth config:", error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        saveLocalStorageUser(userData);
      } else {
        setUser(null);
        saveLocalStorageUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Restore from localStorage immediately to avoid loading flicker
    const cached = getLocalStorageUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    }

    fetchConfig();
    fetchUser();
  }, []);

  const login = () => {
    window.location.href = "/api/auth/login";
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      saveLocalStorageUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, ssoEnabled, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
