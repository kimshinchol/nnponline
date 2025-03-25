import { useState, useEffect } from "react";
import { Button } from "./button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface InactivityOverlayProps {
  timeout?: number; // in milliseconds
  onReconnect: () => void;
}

export function InactivityOverlay({ 
  timeout = 5 * 60 * 1000, // 5 minutes default
  onReconnect 
}: InactivityOverlayProps) {
  const [isInactive, setIsInactive] = useState(false);
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setIsInactive(true);
      }, timeout);
    };

    // Event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      if (!isInactive) {
        resetTimer();
      }
    };

    // Initial timer setup
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      // Cleanup
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [timeout, isInactive]);

  const handleReconnect = async () => {
    try {
      // Refresh the session first
      await refreshSession();

      // Invalidate and refetch all queries to get fresh data
      await queryClient.invalidateQueries();

      // Reset inactivity state
      setIsInactive(false);

      // Call the provided reconnect handler
      onReconnect();
    } catch (error) {
      console.error("Reconnection failed:", error);
      // If reconnection fails, redirect to login
      window.location.href = "/auth";
    }
  };

  if (!isInactive) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-semibold mb-4">세션이 만료되었습니다</h2>
        <p className="text-muted-foreground mb-4">장시간 활동이 없어 연결이 끊어졌습니다.</p>
        <Button 
          onClick={handleReconnect}
          className="w-full"
        >
          재연결
        </Button>
      </div>
    </div>
  );
}