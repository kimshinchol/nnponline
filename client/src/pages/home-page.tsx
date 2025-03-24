import { Navigation } from "@/components/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Link } from "wouter";

const TEAMS = ["PM", "CM", "CC", "AT", "MT"];

type TeamTaskCounts = {
  notStarted: number;
  inProgress: number;
  completed: number;
};

export default function HomePage() {
  const { user } = useAuth();

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/user"],
  });

  // Fetch all team tasks
  const teamQueries = TEAMS.map((team) =>
    useQuery<Task[]>({
      queryKey: ["/api/tasks/team", team],
      queryFn: async () => {
        const res = await fetch(`/api/tasks/team/${team}`);
        if (!res.ok) throw new Error("Failed to fetch team tasks");
        return res.json();
      },
    })
  );

  const pendingTasks = tasks?.filter((task) => task.status === "작업전").length || 0;
  const inProgressTasks = tasks?.filter((task) => task.status === "작업중").length || 0;
  const completedTasks = tasks?.filter((task) => task.status === "완료").length || 0;

  const getTeamTaskCounts = (teamTasks: Task[] | undefined): TeamTaskCounts => ({
    notStarted: teamTasks?.filter((task) => task.status === "작업전").length || 0,
    inProgress: teamTasks?.filter((task) => task.status === "작업중").length || 0,
    completed: teamTasks?.filter((task) => task.status === "완료").length || 0,
  });

  return (
    <div className="flex min-h-screen font-sans">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 mb-6"></div>
          <h1 className="text-lg lg:text-xl font-medium mb-6">Welcome, {user?.username}!</h1>

          {/* Personal Task Status - Clickable Cards */}
          <Link href="/personal">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 cursor-pointer">
              <Card className="bg-card hover:bg-accent transition-colors">
                <CardHeader className="text-center py-3">
                  <CardTitle className="text-sm lg:text-base flex justify-center">진행전</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-2">
                  <p className="text-xl lg:text-2xl font-medium flex justify-center items-center">{pendingTasks}</p>
                </CardContent>
              </Card>

              <Card className="bg-card hover:bg-accent transition-colors">
                <CardHeader className="text-center py-3">
                  <CardTitle className="text-sm lg:text-base flex justify-center">진행중</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-2">
                  <p className="text-xl lg:text-2xl font-medium flex justify-center items-center">{inProgressTasks}</p>
                </CardContent>
              </Card>

              <Card className="bg-card hover:bg-accent transition-colors">
                <CardHeader className="text-center py-3">
                  <CardTitle className="text-sm lg:text-base flex justify-center">완료</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-2">
                  <p className="text-xl lg:text-2xl font-medium flex justify-center items-center">{completedTasks}</p>
                </CardContent>
              </Card>
            </div>
          </Link>

          {/* Team Section */}
          <div className="mt-12">
            <h2 className="text-lg font-medium mb-4">Team Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {TEAMS.map((team, index) => {
                const teamTasks = teamQueries[index].data;
                const counts = getTeamTaskCounts(teamTasks);

                return (
                  <Link key={team} href={`/team?active=${team}`}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      {/* Mobile: Left align team name, Right align status counts */}
                      <div className="md:hidden flex items-center justify-between p-4">
                        <CardTitle className="text-sm">{team}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-medium">
                            {counts.notStarted}
                          </span>
                          <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium">
                            {counts.inProgress}
                          </span>
                          <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-medium">
                            {counts.completed}
                          </span>
                        </div>
                      </div>

                      {/* Desktop: Center team name and stack status counts */}
                      <div className="hidden md:block">
                        <CardHeader className="py-3 text-center">
                          <CardTitle className="text-sm lg:text-base">{team}</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <div className="flex justify-center">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-medium">
                                {counts.notStarted}
                              </span>
                              <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium">
                                {counts.inProgress}
                              </span>
                              <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-medium">
                                {counts.completed}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {!user?.isApproved && (
            <Card className="bg-yellow-50 border-yellow-200 mt-6">
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