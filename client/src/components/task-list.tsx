import { Task } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskForm } from "./task-form";
import { Pencil } from "lucide-react";
import { Celebration } from "@/components/ui/celebration";

interface TaskListProps {
  tasks: Task[];
  onStatusChange?: (taskId: number, status: string) => void;
  onDelete?: (taskId: number) => void;
  onEdit?: (taskId: number, updatedTask: Partial<Task>) => void;
  projects?: { id: number; name: string }[];
  showAuthor?: boolean;
  showActions?: boolean;
  showProject?: boolean;
  isLoading?: boolean;
}

export function TaskList({
  tasks,
  onStatusChange,
  onDelete,
  onEdit,
  projects = [],
  showAuthor = false,
  showActions = true,
  showProject = true,
  isLoading
}: TaskListProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "작업전":
        return "bg-yellow-500";
      case "작업중":
        return "bg-red-500";
      case "완료":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      "작업전": "작업중",
      "작업중": "완료",
      "완료": "작업전"
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || "작업전";
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId) return "No Project";
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : "Unknown Project";
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleEditSubmit = (updatedTask: Partial<Task>) => {
    if (editingTask && onEdit) {
      onEdit(editingTask.id, updatedTask);
      setEditingTask(null);
    }
  };

  const handleStatusClick = (taskId: number, currentStatus: string) => {
    if (onStatusChange) {
      const newStatus = getNextStatus(currentStatus);
      if (newStatus === "완료") {
        setShowCelebration(true);
      }
      onStatusChange(taskId, newStatus);
    }
  };

  if (isLoading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <>
      {showCelebration && (
        <Celebration onComplete={() => setShowCelebration(false)} />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            {showProject && <TableHead>Project</TableHead>}
            {showAuthor && <TableHead>Author</TableHead>}
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>{task.description}</TableCell>
              <TableCell>
                <Badge 
                  className={`${getStatusColor(task.status)} cursor-pointer min-w-[60px] text-center inline-flex justify-center items-center`}
                  onClick={() => handleStatusClick(task.id, task.status)}
                >
                  {task.status}
                </Badge>
              </TableCell>
              {showProject && <TableCell>{getProjectName(task.projectId)}</TableCell>}
              {showAuthor && <TableCell>{task.username || "Unknown"}</TableCell>}
              {showActions && (
                <TableCell>
                  {onEdit && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Task</DialogTitle>
                        </DialogHeader>
                        <TaskForm
                          onSubmit={handleEditSubmit}
                          projects={projects}
                          initialData={task}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}