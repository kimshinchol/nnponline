import { useState, useEffect } from "react";
import { Button } from "./button";

interface InactivityOverlayProps {
  timeout?: number; // in milliseconds
  onReconnect: () => void;
}

export function InactivityOverlay({ 
  timeout = 5 * 60 * 1000, // 5 minutes default
  onReconnect 
}: InactivityOverlayProps) {
  const [isInactive, setIsInactive] = useState(false);
  
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => setIsInactive(true), timeout);
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
  
  if (!isInactive) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-xl font-semibold mb-4">Session Inactive</h2>
        <p className="mb-4 text-muted-foreground">Your session has been inactive for 5 minutes.</p>
        <Button 
          onClick={() => {
            setIsInactive(false);
            onReconnect();
          }}
        >
          Reconnect
        </Button>
      </div>
    </div>
  );
}
