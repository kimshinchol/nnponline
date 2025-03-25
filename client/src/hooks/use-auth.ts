import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface AuthContextType {
  user: any;
  isLoading: boolean;
  logoutMutation: any;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      return res.json();
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all queries from cache
      setLocation("/auth");
    }
  });

  const refreshSession = async () => {
    try {
      // Attempt to refresh the session
      const res = await fetch("/api/session/refresh", {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) {
        throw new Error("Failed to refresh session");
      }

      // Invalidate user query to refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      return true;
    } catch (error) {
      console.error("Session refresh failed:", error);
      return false;
    }
  };

  const value = {
    user,
    isLoading,
    logoutMutation,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}