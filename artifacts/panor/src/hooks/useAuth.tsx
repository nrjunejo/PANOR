import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLogin } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface User {
  id: number;
  email: string;
  name: string;
  role: "patient" | "doctor" | "lab" | "analyst" | "admin";
  specialization?: string | null;
  medicalId?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("panor_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("panor_token"));

  const loginMutation = useLogin();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("panor_token"));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    return new Promise<void>((resolve, reject) => {
      loginMutation.mutate(
        { data: { email, password } },
        {
          onSuccess: (data: any) => {
            const t = data.token as string;
            const u = data.user as User;
            setToken(t);
            setUser(u);
            localStorage.setItem("panor_token", t);
            localStorage.setItem("panor_user", JSON.stringify(u));
            resolve();
          },
          onError: (err: any) => reject(err),
        }
      );
    });
  }, [loginMutation]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("panor_token");
    localStorage.removeItem("panor_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
