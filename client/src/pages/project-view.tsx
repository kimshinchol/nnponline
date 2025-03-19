import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, InsertProject } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Command, CommandInput } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ProjectView() {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");

  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/project"],
  });

  const tasksByProject = tasks?.reduce((acc, task) => {
    const projectId = task.projectId;
    if (!projectId) return acc;
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setProjectName("");
    },
  });

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    createProjectMutation.mutate({ name: projectName });
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto w-full">
          <div className="h-8 mb-6"></div> {/* Spacer for mobile menu */}
          <div className="flex justify-start mb-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="text-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(calc(100vw-2rem),425px)]">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <CommandInput
                    placeholder="Enter project name..."
                    value={projectName}
                    onValueChange={setProjectName}
                  />
                  <Button
                    onClick={handleCreateProject}
                    disabled={createProjectMutation.isPending}
                    size="sm"
                    className="w-full"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tasksLoading ? (
            <div>Loading tasks...</div>
          ) : !tasksByProject || Object.keys(tasksByProject).length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">No Tasks Found</CardTitle>
                <CardDescription className="text-xs">
                  Create tasks in your personal view and assign them to projects
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4 w-full overflow-x-hidden">
              {Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
                const project = projects?.find(
                  (p) => p.id === parseInt(projectId)
                );
                return (
                  <Card key={projectId} className="w-full">
                    <CardHeader>
                      <div>
                        <CardTitle className="text-sm">{project?.name || "Untitled Project"}</CardTitle>
                        <CardDescription className="text-xs">
                          {projectTasks.length} task
                          {projectTasks.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="w-full overflow-x-hidden">
                      <TaskList
                        tasks={projectTasks}
                        projects={projects}
                        showAuthor={true}
                        showActions={false}
                        showProject={false}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}