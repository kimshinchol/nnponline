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
  Share2Icon,
  BellIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Query for co-work tasks to check for new ones
  const { data: coWorkTasks = [] } = useQuery({
    queryKey: ["/api/tasks/co-work"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/co-work");
      if (!res.ok) throw new Error("Failed to fetch co-work tasks");
      return res.json();
    }
  });

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

  const hasNewCoWorkTasks = coWorkTasks.length > 0;

  const activeClass = "bg-[#939598] text-white hover:bg-[#939598] hover:text-white [&>svg]:text-white";

  return (
    <>
      {/* Mobile Menu Button - Only show when menu is closed */}
      {!isMobileMenuOpen && (
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Navigation Sidebar */}
      <nav
        className={cn(
          "fixed h-screen bg-sidebar border-r p-4 flex flex-col transition-transform duration-300 z-40",
          "w-64",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button positioned at top left of menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-4 left-4">
            <button
              className="p-2 hover:bg-muted rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}

        <div className="flex items-center mb-8 pl-2 mt-14 lg:mt-0">
          <img src="/logo.png" alt="Logo" className="h-8" />
        </div>

        <div className="flex flex-col space-y-2">
          <Link href="/">
            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/") ? activeClass : ""}`}
            >
              <HomeIcon className="mr-2 h-4 w-4" />
              OVERVIEW
            </Button>
          </Link>
          <Link href="/personal">
            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/personal") ? activeClass : ""}`}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              TASKS
            </Button>
          </Link>
          <Link href="/team">
            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/team") ? activeClass : ""}`}
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              TEAM
            </Button>
          </Link>
          <Link href="/project">
            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/project") ? activeClass : ""}`}
            >
              <FolderIcon className="mr-2 h-4 w-4" />
              PROJECT
            </Button>
          </Link>
          <Link href="/scheduler">
            <Button
              variant="ghost"
              className={`w-full justify-start ${isActive("/scheduler") ? activeClass : ""}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              SCHEDULER
            </Button>
          </Link>
          <Link href="/co-work">
            <Button
              variant="ghost"
              className={`w-full justify-start relative ${isActive("/co-work") ? activeClass : ""}`}
            >
              <Share2Icon className="mr-2 h-4 w-4" />
              CO-WORK
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <BellIcon
                  className={`h-4 w-4 ${
                    isActive("/co-work")
                      ? "text-white" // White when menu is active (gray background)
                      : "text-red-500" // Red when menu is inactive (white background)
                  }`}
                />
                {coWorkTasks.length > 0 && (
                  <span className="ml-1 font-bold text-red-500 text-sm">
                    {coWorkTasks.length}
                  </span>
                )}
              </div>
            </Button>
          </Link>
          {/* Show Admin link only for admin users */}
          {user?.isAdmin && (
            <Link href="/admin">
              <Button
                variant="ghost"
                className={`w-full justify-start ${isActive("/admin") ? activeClass : ""}`}
              >
                <ShieldIcon className="mr-2 h-4 w-4" />
                ADMIN
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
            LOGOUT
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