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

  // Fetch projects and their tasks
  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/project"],
  });

  // Group tasks by project
  const tasksByProject = tasks?.reduce((acc, task) => {
    const projectId = task.projectId;
    if (!projectId) return acc;
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

  // Mutations
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
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center lg:justify-end mb-8">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
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
                  >
                    {createProjectMutation.isPending
                      ? "Creating..."
                      : "Create Project"}
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
                <CardTitle>No Tasks Found</CardTitle>
                <CardDescription>
                  Create tasks in your personal view and assign them to projects
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-8 overflow-x-hidden">
              {Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
                const project = projects?.find(
                  (p) => p.id === parseInt(projectId)
                );
                return (
                  <Card key={projectId}>
                    <CardHeader>
                      <div>
                        <CardTitle>{project?.name || "Untitled Project"}</CardTitle>
                        <CardDescription>
                          {projectTasks.length} task
                          {projectTasks.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
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