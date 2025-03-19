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
import { motion, AnimatePresence } from "framer-motion";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed h-screen w-16 hover:w-64 bg-sidebar border-r p-4 flex flex-col transition-all duration-300 ease-in-out group">
      <div className="flex items-center mb-8 pl-2">
        <img src="/logo.png" alt="Logo" className="h-8" />
      </div>

      <div className="flex flex-col space-y-2">
        {[
          { path: "/", icon: HomeIcon, label: "Dashboard" },
          { path: "/personal", icon: UserIcon, label: "Tasks" },
          { path: "/team", icon: UsersIcon, label: "Team" },
          { path: "/project", icon: FolderIcon, label: "Project" },
          { path: "/scheduler", icon: CalendarIcon, label: "Scheduler" },
          ...(user?.isAdmin ? [{ path: "/admin", icon: ShieldIcon, label: "Admin" }] : []),
        ].map(({ path, icon: Icon, label }) => (
          <Link key={path} href={path}>
            <Button 
              variant="ghost" 
              className={`w-full justify-start relative ${isActive(path) ? 'bg-accent' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <AnimatePresence>
                <motion.span 
                  className={`ml-2 absolute left-8 whitespace-nowrap ${
                    isActive(path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ 
                    x: isActive(path) || document.querySelector('nav:hover') ? 0 : -20,
                    opacity: isActive(path) || document.querySelector('nav:hover') ? 1 : 0
                  }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {label}
                </motion.span>
              </AnimatePresence>
            </Button>
          </Link>
        ))}
      </div>

      <div className="mt-auto">
        <div className="mb-4 p-4 border rounded-lg overflow-hidden">
          <AnimatePresence>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ 
                x: document.querySelector('nav:hover') ? 0 : -20,
                opacity: document.querySelector('nav:hover') ? 1 : 0
              }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.team}</p>
              {user?.isAdmin && (
                <p className="text-xs text-primary mt-1">Administrator</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOutIcon className="h-4 w-4" />
          <AnimatePresence>
            <motion.span
              className="ml-2 absolute left-8 whitespace-nowrap opacity-0 group-hover:opacity-100"
              initial={{ x: -20, opacity: 0 }}
              animate={{ 
                x: document.querySelector('nav:hover') ? 0 : -20,
                opacity: document.querySelector('nav:hover') ? 1 : 0
              }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Logout
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </nav>
  );
}