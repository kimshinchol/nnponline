import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TEAMS = ["PM", "CM", "CC", "AT", "MT"];

export default function TeamView() {
  const teamQueries = TEAMS.map((team) =>
    useQuery<Task[]>({
      queryKey: ["/api/tasks/team", team],
      queryFn: ({ queryKey: [, team] }) =>
        fetch(`/api/tasks/team/${team}`).then((r) => r.json()),
    }),
  );

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Team View</h1>

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
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">{team} Team Tasks</h2>
                </div>
                <TaskList
                  tasks={teamQueries[index].data || []}
                  isLoading={teamQueries[index].isLoading}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
