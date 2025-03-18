import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  HomeIcon,
  UserIcon,
  UsersIcon,
  FolderIcon,
  LogOutIcon,
  ShieldIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="fixed h-screen w-64 bg-sidebar border-r p-4 flex flex-col">
      <div className="flex items-center justify-center mb-8">
        <h1 className="text-2xl font-bold text-sidebar-foreground">Work Journal</h1>
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
            Personal Tasks
          </Button>
        </Link>
        <Link href="/team">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
          >
            <UsersIcon className="mr-2 h-4 w-4" />
            Team View
          </Button>
        </Link>
        <Link href="/project">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
          >
            <FolderIcon className="mr-2 h-4 w-4" />
            Project View
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
              Admin Dashboard
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