import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskForm } from "@/components/task-form";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CoWorkView() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/co-work"],
    select: (data) => {
      // Sort tasks by creation date, newest first
      return [...data].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  });

  const acceptTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("POST", `/api/tasks/co-work/${taskId}/accept`);
      if (!res.ok) throw new Error("Failed to accept task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/co-work"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/date"] });
      toast({
        title: "Success",
        description: "Task accepted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept task",
        variant: "destructive",
      });
    },
  });

  const editTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number; data: Partial<Task> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/co-work"] });
      setEditingTask(null);
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("DELETE", `/api/tasks/co-work/${taskId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete task");
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/co-work"] });
      setTaskToDelete(null);
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const taskActions = (task: Task) => [
    {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Accept",
      onClick: () => acceptTaskMutation.mutate(task.id),
    },
    {
      icon: <Pencil className="h-4 w-4" />,
      label: "Edit",
      onClick: () => setEditingTask(task),
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: "Delete",
      onClick: () => setTaskToDelete(task.id),
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto w-full">
          <div className="h-8 mb-6"></div>
          <div className="flex justify-between items-center mb-6">
            <div></div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  업무요청등록
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(calc(100vw-2rem),425px)]">
                <DialogHeader>
                  <DialogTitle>Create Co-Work Task</DialogTitle>
                </DialogHeader>
                <TaskForm
                  onSubmit={async (data) => {
                    const res = await apiRequest("POST", "/api/tasks/co-work", data);
                    if (!res.ok) {
                      const error = await res.json();
                      throw new Error(error.message || "Failed to create task");
                    }
                    setIsDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/tasks/co-work"] });
                  }}
                  projects={projects || []}
                  isCoWork={true}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Task Dialog */}
          <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
            <DialogContent className="max-w-[min(calc(100vw-2rem),425px)]">
              <DialogHeader>
                <DialogTitle>Edit Co-Work Task</DialogTitle>
              </DialogHeader>
              {editingTask && (
                <TaskForm
                  onSubmit={async (data) => {
                    await editTaskMutation.mutateAsync({
                      taskId: editingTask.id,
                      data: {
                        ...data,
                        isCoWork: true,
                      },
                    });
                  }}
                  projects={projects || []}
                  initialData={editingTask}
                  isCoWork={true}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => !open && setTaskToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업을 삭제하면 복구할 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTaskToDelete(null)}>아니오</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => taskToDelete && deleteTaskMutation.mutate(taskToDelete)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  예
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <TaskList
            tasks={tasks}
            projects={projects || []}
            showAuthor={true}
            customActions={taskActions}
            isLoading={isLoading}
            alwaysShowHeader={true}
          />
        </div>
      </main>
    </div>
  );
}