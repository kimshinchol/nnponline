import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function WebAdminAuthPage() {
  const { loginMutation, registerAdminMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if any users exist
  const { data: userExists } = useQuery<{ exists: boolean }>({
    queryKey: ["/api/user/exists"],
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      team: "PM",
    },
  });

  const handleSubmit = (data: InsertUser) => {
    if (!userExists?.exists) {
      // First admin registration
      registerAdminMutation.mutate(data, {
        onSuccess: () => setLocation("/"),
      });
    } else {
      // Admin login
      loginMutation.mutate(
        {
          username: data.username,
          password: data.password,
        },
        {
          onSuccess: () => setLocation("/"),
          onError: (error) => {
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
      <Card className="w-[400px] bg-white shadow-sm">
        <CardHeader className="space-y-8 items-center text-center">
          <div className="w-24 h-24 flex items-center justify-center">
            <img 
              src="/logo.png"
              alt="N&P Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                console.log("Logo failed to load, falling back to text");
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<h1 class="text-4xl font-bold text-gray-600">N&P</h1>';
                }
              }}
            />
          </div>
          </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="password" placeholder="PASSWORD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gray-600 hover:bg-gray-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login as Admin"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" className="text-gray-600">
                  {!userExists?.exists && "CREATE INITIAL ADMIN ACCOUNT"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Initial Admin Account</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="password" placeholder="PASSWORD" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerAdminMutation.isPending}
                    >
                      {registerAdminMutation.isPending ? "Creating..." : "Create Initial Admin Account"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}