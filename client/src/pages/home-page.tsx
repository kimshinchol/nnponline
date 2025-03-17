import { Navigation } from "@/components/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/user"],
  });

  const pendingTasks = tasks?.filter((task) => task.status === "pending").length || 0;
  const inProgressTasks = tasks?.filter((task) => task.status === "in-progress").length || 0;
  const completedTasks = tasks?.filter((task) => task.status === "completed").length || 0;

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Welcome, {user?.username}!</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingTasks}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{inProgressTasks}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{completedTasks}</p>
              </CardContent>
            </Card>
          </div>

          {!user.isApproved && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800">Account Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700">
                  Your account is pending administrator approval. Some features may be limited until your account is approved.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
