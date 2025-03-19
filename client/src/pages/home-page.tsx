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

  const pendingTasks = tasks?.filter((task) => task.status === "작업전").length || 0;
  const inProgressTasks = tasks?.filter((task) => task.status === "작업중").length || 0;
  const completedTasks = tasks?.filter((task) => task.status === "완료").length || 0;

  return (
    <div className="flex min-h-screen font-sans">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 mb-6"></div> {/* Spacer for mobile menu */}
          <h1 className="text-lg lg:text-xl font-medium mb-6">Welcome, {user?.username}!</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Card className="bg-card">
              <CardHeader className="text-center py-3">
                <CardTitle className="text-sm lg:text-base flex justify-center">진행전</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-2">
                <p className="text-xl lg:text-2xl font-medium flex justify-center items-center">{pendingTasks}</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="text-center py-3">
                <CardTitle className="text-sm lg:text-base flex justify-center">진행중</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-2">
                <p className="text-xl lg:text-2xl font-medium flex justify-center items-center">{inProgressTasks}</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="text-center py-3">
                <CardTitle className="text-sm lg:text-base flex justify-center">완료</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-2">
                <p className="text-xl lg:text-2xl font-medium flex justify-center items-center">{completedTasks}</p>
              </CardContent>
            </Card>
          </div>

          {!user?.isApproved && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-800 text-sm">Account Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700 text-xs">
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