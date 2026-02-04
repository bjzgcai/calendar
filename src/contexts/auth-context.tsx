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
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        console.log("=== 用户登录信息 ===");
        console.log("用户ID:", userData.userId);
        console.log("钉钉用户ID:", userData.dingtalkUserId);
        console.log("用户名:", userData.name);
        console.log("头像:", userData.avatar);
        console.log("邮箱:", userData.email);
        console.log("登录状态:", userData.isLoggedIn);
        console.log("完整用户数据:", userData);
        console.log("===================");
        setUser(userData);
      } else {
        console.log("用户未登录或会话已过期");
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = () => {
    window.location.href = "/api/auth/login";
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
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
