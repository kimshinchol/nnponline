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
    queryKey: ["/api/tasks/user", selectedDate?.toISOString()],
    enabled: !!selectedDate,
  });

  // Filter tasks for the selected date and organize by project, using KST
  const tasksByProject = tasks?.reduce((acc, task) => {
    if (!selectedDate) return acc;

    const kstOffset = 9 * 60; // KST is UTC+9
    const taskDate = new Date(task.createdAt);
    const kstTaskDate = new Date(taskDate.getTime() + kstOffset * 60000);
    const kstSelectedDate = new Date(selectedDate.getTime() + kstOffset * 60000);

    const isSameDate =
      kstTaskDate.getFullYear() === kstSelectedDate.getFullYear() &&
      kstTaskDate.getMonth() === kstSelectedDate.getMonth() &&
      kstTaskDate.getDate() === kstSelectedDate.getDate();

    if (!isSameDate) return acc;

    const projectId = task.projectId || "unassigned";
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<string | number, Task[]>);

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Task History</h1>

          <div className="space-y-8">
            {/* Calendar Section */}
            <Card>
              <CardHeader>
                <CardTitle>Select Date (KST)</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date || new Date())}
                  className="rounded-md border w-full"
                />
              </CardContent>
            </Card>

            {/* Tasks By Project Section */}
            {projects?.map((project) => (
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
      </main>
    </div>
  );
}