import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  registerAdminMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  refreshSession: () => Promise<boolean>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", window.location.pathname.includes('web_admin') ? "/api/web_admin/login" : "/api/login", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Registration successful",
        description: "Your account has been created. Please wait for an administrator to approve your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerAdminMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/web_admin/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Admin Account Created",
        description: "You have been registered as an admin user."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Admin Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshSession = async () => {
    try {
      const res = await apiRequest("POST", "/api/session/refresh");
      if (!res.ok) {
        throw new Error("Failed to refresh session");
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      return true;
    } catch (error) {
      console.error("Session refresh failed:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        registerAdminMutation,
        refreshSession,
      }}
    >
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