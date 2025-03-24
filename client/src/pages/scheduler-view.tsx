import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery } from "@tanstack/react-query";
import { Task, Project } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { format } from "date-fns";

export default function SchedulerView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/date", selectedDate?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/date?date=${selectedDate?.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!selectedDate,
  });

  // Filter tasks for the selected date and organize by project
  const tasksByProject = tasks?.reduce((acc, task) => {
    const projectId = task.projectId || "unassigned";
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<string | number, Task[]>);

  // Get list of project IDs that have tasks for the selected date
  const projectIdsWithTasks = Object.keys(tasksByProject || {}).map(id =>
    id === "unassigned" ? null : parseInt(id)
  );

  // Filter projects to only show those with tasks
  const projectsWithTasks = projects?.filter(project =>
    projectIdsWithTasks.includes(project.id)
  );

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 mb-8"></div>

          <div className="space-y-8">
            {/* Calendar Section - Centered */}
            <div className="flex justify-center">
              <Card className="w-full max-w-sm">
                <CardContent className="flex justify-center pt-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Tasks By Project Section */}
            <div className="space-y-4 overflow-x-hidden">
              {projectsWithTasks?.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskList
                      tasks={tasksByProject?.[project.id] || []}
                      projects={projects}
                      isLoading={isLoading}
                      showActions={false}
                      showProject={false}
                      showAuthor={true}
                      alwaysShowHeader={true}
                    />
                  </CardContent>
                </Card>
              ))}

              {/* Unassigned Tasks */}
              {tasksByProject?.["unassigned"] &&
                tasksByProject["unassigned"].length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Unassigned Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TaskList
                        tasks={tasksByProject["unassigned"]}
                        projects={projects}
                        isLoading={isLoading}
                        showActions={false}
                        showProject={false}
                        showAuthor={true}
                        alwaysShowHeader={true}
                      />
                    </CardContent>
                  </Card>
                )}

              {!isLoading &&
                (!tasksByProject || Object.keys(tasksByProject).length === 0) && (
                  <p className="text-center text-muted-foreground">
                    No tasks found for {format(selectedDate, "MMMM d, yyyy")} (KST)
                  </p>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}