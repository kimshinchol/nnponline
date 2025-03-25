import { useState } from "react";
import { Button } from "./button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface InactivityOverlayProps {
  onReconnect: () => void;
}

export function InactivityOverlay({ 
  onReconnect 
}: InactivityOverlayProps) {
  const [isInactive, setIsInactive] = useState(false);
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();

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

  // Component will only be shown when manually triggered
  if (!isInactive) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-semibold mb-4">세션이 만료되었습니다</h2>
        <p className="text-muted-foreground mb-4">연결이 끊어졌습니다.</p>
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