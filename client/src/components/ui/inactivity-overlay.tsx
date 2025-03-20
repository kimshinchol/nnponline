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
      inactivityTimer = setTimeout(() => {
        console.log('Inactivity timeout reached, showing overlay');
        setIsInactive(true);
      }, timeout);
      console.log('Inactivity timer reset');
    };

    // Event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      console.log('Activity detected');
      if (!isInactive) {
        resetTimer();
      }
    };

    // Initial timer setup
    console.log('Setting up initial inactivity timer');
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      // Cleanup
      console.log('Cleaning up inactivity timer');
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [timeout, isInactive]);

  if (!isInactive) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-xl font-semibold mb-4">세션 비활성화 / Session Inactive</h2>
        <p className="mb-4 text-muted-foreground">
          5분 동안 활동이 없었습니다.<br />
          Your session has been inactive for 5 minutes.
        </p>
        <Button 
          onClick={() => {
            console.log('Reconnect clicked');
            setIsInactive(false);
            onReconnect();
          }}
          className="w-full"
        >
          재연결 / Reconnect
        </Button>
      </div>
    </div>
  );
}