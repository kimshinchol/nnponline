import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  HomeIcon,
  UserIcon,
  UsersIcon,
  FolderIcon,
  LogOutIcon,
  ShieldIcon,
  CalendarIcon,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  // Only render navigation if user is authenticated
  if (!user) return null;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {!isMobileMenuOpen && <Menu className="h-6 w-6" />}
      </button>

      {/* Navigation Sidebar */}
      <nav
        className={cn(
          "fixed h-screen bg-sidebar border-r p-4 flex flex-col transition-transform duration-300 z-40",
          "w-64",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button positioned at top right of menu */}
        {isMobileMenuOpen && (
          <button
            className="lg:hidden absolute top-4 right-4 p-2 rounded-md"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        )}

        <div className="flex items-center mb-8 pl-2">
          <img src="/logo.png" alt="Logo" className="h-8" />
        </div>

        <div className="flex flex-col space-y-2">
          <Link href="/">
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${isActive("/") ? "bg-black text-white hover:bg-black hover:text-white [&>svg]:text-white" : ""}`}
            >
              <HomeIcon className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/personal">
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${isActive("/personal") ? "bg-black text-white hover:bg-black hover:text-white [&>svg]:text-white" : ""}`}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Tasks
            </Button>
          </Link>
          <Link href="/team">
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${isActive("/team") ? "bg-black text-white hover:bg-black hover:text-white [&>svg]:text-white" : ""}`}
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              Team
            </Button>
          </Link>
          <Link href="/project">
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${isActive("/project") ? "bg-black text-white hover:bg-black hover:text-white [&>svg]:text-white" : ""}`}
            >
              <FolderIcon className="mr-2 h-4 w-4" />
              Project
            </Button>
          </Link>
          <Link href="/scheduler">
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${isActive("/scheduler") ? "bg-black text-white hover:bg-black hover:text-white [&>svg]:text-white" : ""}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Scheduler
            </Button>
          </Link>
          {/* Show Admin link only for admin users */}
          {user?.isAdmin && (
            <Link href="/admin">
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${isActive("/admin") ? "bg-black text-white hover:bg-black hover:text-white [&>svg]:text-white" : ""}`}
              >
                <ShieldIcon className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-auto">
          <div className="mb-4 p-4 border rounded-lg">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-muted-foreground">{user?.team}</p>
            {user?.isAdmin && (
              <p className="text-xs text-primary mt-1">Administrator</p>
            )}
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOutIcon className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}