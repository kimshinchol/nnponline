import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery } from "@tanstack/react-query";
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
import { Plus } from "lucide-react";
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

  // Group tasks by project
  const tasksByProject = tasks?.reduce((acc, task) => {
    const projectId = task.projectId;
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<number, Task[]>);

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
                                onSelect={() => setProjectName(project.name)}
                              >
                                {project.name}
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
                    <CardHeader>
                      <CardTitle>{project?.name || "Untitled Project"}</CardTitle>
                      <CardDescription>
                        {projectTasks.length} task
                        {projectTasks.length !== 1 ? "s" : ""}
                      </CardDescription>
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