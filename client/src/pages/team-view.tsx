import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TEAMS = ["PM", "CM", "CC", "AT", "MT"];

export default function TeamView() {
  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const teamQueries = TEAMS.map((team) =>
    useQuery<Task[]>({
      queryKey: ["/api/tasks/team", team],
      queryFn: async ({ queryKey: [, team] }) => {
        const res = await fetch(`/api/tasks/team/${team}`);
        if (!res.ok) throw new Error("Failed to fetch team tasks");
        return res.json();
      },
    }),
  );

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 mb-8"></div>

          <Tabs defaultValue="PM" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {TEAMS.map((team) => (
                <TabsTrigger key={team} value={team}>
                  {team}
                </TabsTrigger>
              ))}
            </TabsList>

            {TEAMS.map((team, index) => (
              <TabsContent key={team} value={team}>
                <div className="overflow-x-hidden">
                  <TaskList
                    tasks={teamQueries[index].data || []}
                    isLoading={teamQueries[index].isLoading}
                    projects={projects}
                    showAuthor={true}
                    showActions={false}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
}