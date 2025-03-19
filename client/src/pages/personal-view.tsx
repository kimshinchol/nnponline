import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { TaskForm } from "@/components/task-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, InsertTask } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PersonalView() {
  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/user"],
  });

  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: InsertTask) => {
      try {
        console.log("Submitting task:", task);
        const res = await apiRequest("POST", "/api/tasks", task);
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to create task");
        }
        return res.json();
      } catch (error) {
        console.error("Task creation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/team"] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Task> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/team"] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/team"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/team"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
  });

  const handleCreateTask = (data: InsertTask) => {
    createTaskMutation.mutate(data);
  };

  const handleEditTask = (taskId: number, updatedTask: Partial<Task>) => {
    updateTaskMutation.mutate({ id: taskId, data: updatedTask });
  };

  const handleStatusChange = (taskId: number, status: string) => {
    updateTaskStatusMutation.mutate({ id: taskId, status });
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="w-20"></div> {/* Spacer to maintain layout */}
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <TaskForm
                  onSubmit={handleCreateTask}
                  projects={projects || []}
                  isLoading={createTaskMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          <TaskList
            tasks={tasks || []}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteTask}
            onEdit={handleEditTask}
            projects={projects}
            isLoading={tasksLoading}
          />
        </div>
      </main>
    </div>
  );
}