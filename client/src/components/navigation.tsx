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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed h-screen w-64 bg-sidebar border-r p-4 flex flex-col">
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
  );
}