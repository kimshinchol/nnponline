import { Link } from "wouter";
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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="fixed h-screen w-64 bg-sidebar border-r p-4 flex flex-col">
      <div className="flex items-center mb-8 pl-2">
        <img src="/logo.png" alt="Logo" className="h-8" />
      </div>

      <div className="flex flex-col space-y-2">
        <Link href="/">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
          >
            <HomeIcon className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/personal">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            Tasks
          </Button>
        </Link>
        <Link href="/team">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
          >
            <UsersIcon className="mr-2 h-4 w-4" />
            Team
          </Button>
        </Link>
        <Link href="/project">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
          >
            <FolderIcon className="mr-2 h-4 w-4" />
            Project
          </Button>
        </Link>
        <Link href="/scheduler">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
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
              className="w-full justify-start"
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
          className="w-full" 
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