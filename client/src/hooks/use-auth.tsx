import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Type for login credentials
type LoginData = Pick<InsertUser, "username" | "password">;

// Type for logout result
type LogoutResult = { success: boolean; message?: string };

// Updated AuthContextType with appropriate types
type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<LogoutResult, Error, void>; // Fixed return type
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  registerAdminMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  refreshSession: () => Promise<boolean>;
};

// Create context with null default value
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query for user data
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Login mutation
  const loginMutation = useMutation<SelectUser, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const isAdmin = window.location.pathname.includes('web_admin');
      const endpoint = isAdmin ? "/api/web_admin/login" : "/api/login";
      const res = await apiRequest("POST", endpoint, credentials);
      
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

  // Logout mutation with improved error handling
  const logoutMutation = useMutation<LogoutResult, Error, void>({
    mutationFn: async () => {
      try {
        const res = await apiRequest("POST", "/api/logout");
        return { 
          success: res.ok,
          message: res.ok ? "Logged out successfully" : "Server logout failed" 
        };
      } catch (error) {
        console.error("Logout request failed:", error);
        return { 
          success: false, 
          message: "Connection error during logout" 
        };
      }
    },
    onSuccess: (result) => {
      // Always clear client state regardless of server response
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      
      // Show notification only if there was a server-side issue
      if (!result.success) {
        toast({
          title: "주의",
          description: "서버 로그아웃에 실패했지만, 로컬 세션은 정리되었습니다.",
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      // Force client-side logout even on error
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "로그아웃 주의",
        description: "서버 로그아웃 처리 중 오류가 발생했지만, 로컬 세션은 정리되었습니다.",
        variant: "default",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation<SelectUser, Error, InsertUser>({
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

  // Admin registration mutation
  const registerAdminMutation = useMutation<SelectUser, Error, InsertUser>({
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

  // Session refresh function
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

  // Provide auth context to children
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

// Hook for accessing auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}