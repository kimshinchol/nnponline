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
import { Pencil, Trash2 } from "lucide-react";
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
      case "pending":
        return "bg-yellow-500";
      case "in-progress":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
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

  const handleStatusChange = (taskId: number, status: string) => {
    if (onStatusChange) {
      if (status === "completed") {
        setShowCelebration(true);
      }
      onStatusChange(taskId, status);
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
                <Badge className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </TableCell>
              {showProject && <TableCell>{getProjectName(task.projectId)}</TableCell>}
              {showAuthor && <TableCell>{task.username || "Unknown"}</TableCell>}
              {showActions && (
                <TableCell className="space-x-2">
                  {onStatusChange && (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="mr-2 p-1 rounded border"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}
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
                  {onDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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