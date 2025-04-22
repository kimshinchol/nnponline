import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const TEAMS = ["PM", "CM", "CC", "AT", "MT"];

export default function TeamView() {
  const [location] = useLocation();
  const [activeTeam, setActiveTeam] = useState("PM");
  const { user } = useAuth();

  // Set initial tab to user's team or get from URL
  useEffect(() => {
    // First check URL params
    const params = new URLSearchParams(window.location.search);
    const teamParam = params.get("active");
    
    if (teamParam && TEAMS.includes(teamParam)) {
      setActiveTeam(teamParam);
    } else if (user?.team && TEAMS.includes(user.team)) {
      // If no URL param, use user's team
      setActiveTeam(user.team);
    }
  }, [location, user]);

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
      select: (data) => {
        // 정렬 우선순위: 1. 상태 (작업전 → 작업중 → 완료), 2. 상태가 같을 경우 생성일자 오름차순(오래된 것이 아래로)
        const statusOrder: {[key: string]: number} = { "작업전": 0, "작업중": 1, "완료": 2 };
        
        return [...data].sort((a, b) => {
          // 상태 비교
          const statusDiff = statusOrder[a.status] - statusOrder[b.status];
          if (statusDiff !== 0) return statusDiff;
          
          // 같은 상태면 생성일자 기준으로 정렬 (최신이 위로 오래된 것이 아래로)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    }),
  );

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 mb-8"></div>

          <Tabs value={activeTeam} onValueChange={setActiveTeam} className="w-full">
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
                    alwaysShowHeader={true}
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