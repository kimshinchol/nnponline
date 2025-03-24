import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, InsertTask } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Share2 } from "lucide-react";

export default function PersonalView() {
  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/user"],
  });

  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
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

  const createTaskMutation = useMutation({
    mutationFn: async (task: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", task);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create task");
      }
      return res.json();
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

  const moveToCoWorkMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/move-to-cowork`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to move task to co-work");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/co-work"] });
      toast({
        title: "Success",
        description: "Task moved to co-work successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move task to co-work",
        variant: "destructive",
      });
    },
  });

  const handleEditTask = (taskId: number, updatedTask: Partial<Task>) => {
    updateTaskMutation.mutate({ id: taskId, data: updatedTask });
  };

  const handleStatusChange = (taskId: number, status: string) => {
    updateTaskStatusMutation.mutate({ id: taskId, status });
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  const handleMoveToCoWork = (taskId: number) => {
    moveToCoWorkMutation.mutate(taskId);
  };

  const taskActions = (task: Task) => [
    {
      icon: <Share2 className="h-4 w-4" />,
      label: "Move to Co-Work",
      onClick: () => handleMoveToCoWork(task.id),
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto w-full">
          <div className="h-8 mb-6"></div>
          <div className="w-full overflow-x-hidden">
            <TaskList
              tasks={tasks || []}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTask}
              onEdit={handleEditTask}
              onCreate={createTaskMutation.mutate}
              projects={projects || []}
              isLoading={tasksLoading}
              createLoading={createTaskMutation.isPending}
              showCreateButton={true}
              customActions={taskActions}
            />
          </div>
        </div>
      </main>
    </div>
  );
}