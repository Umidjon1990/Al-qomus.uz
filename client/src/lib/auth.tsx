import React, { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

interface User {
  username: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const login = async (username: string, password: string) => {
    // Mock login logic
    if (username === "admin" && password === "admin") {
      setUser({ username: "Admin", role: "admin" });
      toast({
        title: "Xush kelibsiz!",
        description: "Admin sifatida tizimga kirdingiz.",
      });
      setLocation("/admin");
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Parol yoki login noto'g'ri (Login: admin, Parol: admin)",
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setLocation("/");
    toast({
      description: "Tizimdan chiqildi.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin" }}>
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
