import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, InsertProject, InsertTask } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
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
import { TaskForm } from "@/components/task-form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProjectView() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  // Fetch projects and their tasks
  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/project", selectedDate?.toISOString()],
    queryFn: async ({ queryKey }) => {
      const date = queryKey[1];
      const params = date ? `?date=${date}` : "";
      const res = await fetch(`/api/tasks/project${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
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

  const createTaskMutation = useMutation({
    mutationFn: async (task: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
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
            <div className="flex gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

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

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    onSubmit={createTaskMutation.mutate}
                    projects={projects || []}
                    isLoading={createTaskMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {tasksLoading ? (
            <div>Loading tasks...</div>
          ) : !tasksByProject || Object.keys(tasksByProject).length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Tasks Found</CardTitle>
                <CardDescription>
                  {selectedDate
                    ? "No tasks found for the selected date"
                    : "Start by creating a project and adding tasks"}
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