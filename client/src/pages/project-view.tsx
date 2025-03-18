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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("DELETE", `/api/projects/${projectId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  const handleDeleteProject = (projectId: number) => {
    if (confirm("Are you sure you want to delete this project? All associated tasks will also be deleted.")) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Project View</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name</Label>
                    <Command>
                      <CommandInput
                        id="projectName"
                        placeholder="Enter project name..."
                        value={projectName}
                        onValueChange={setProjectName}
                      />
                      {projects && projects.length > 0 && (
                        <CommandGroup>
                          {projects
                            .filter((p) =>
                              p.name
                                .toLowerCase()
                                .includes(projectName.toLowerCase())
                            )
                            .map((project) => (
                              <CommandItem
                                key={project.id}
                                className="flex justify-between items-center"
                              >
                                <span onClick={() => setProjectName(project.name)}>
                                  {project.name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(project.id);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                      <CommandEmpty>No matching projects found.</CommandEmpty>
                    </Command>
                  </div>
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
            <div className="space-y-8">
              {Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
                const project = projects?.find(
                  (p) => p.id === parseInt(projectId)
                );
                return (
                  <Card key={projectId}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{project?.name || "Untitled Project"}</CardTitle>
                        <CardDescription>
                          {projectTasks.length} task
                          {projectTasks.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProject(parseInt(projectId))}
                        disabled={deleteProjectMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
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