import { useState } from "react";
import { Button } from "./button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface InactivityOverlayProps {
  onReconnect: () => void;
  timeout?: number; // Making timeout optional
}

export function InactivityOverlay({ 
  onReconnect,
  timeout // Not used - inactivity check is disabled
}: InactivityOverlayProps) {
  // Empty component - inactivity feature is completely disabled
  // This was disabled due to database connection pool issues
  
  return null;
}