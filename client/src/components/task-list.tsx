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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TaskForm } from "./task-form";
import { Pencil, Trash2 } from "lucide-react";
import { Celebration } from "@/components/ui/celebration";
import { motion, AnimatePresence } from "framer-motion";

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
  const [celebrationPosition, setCelebrationPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

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

  const handleStatusClick = (taskId: number, currentStatus: string, event: React.MouseEvent) => {
    if (onStatusChange) {
      const newStatus = getNextStatus(currentStatus);
      if (newStatus === "완료") {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        setCelebrationPosition({
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top + buttonRect.height / 2
        });
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }
      onStatusChange(taskId, newStatus);
    }
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

  if (isLoading) {
    return <div>Loading tasks...</div>;
  }

  // Animation variants
  const tableRowVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    }),
    exit: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <>
      {showCelebration && celebrationPosition && (
        <Celebration 
          position={celebrationPosition}
          onComplete={() => setShowCelebration(false)} 
        />
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
          <AnimatePresence mode="popLayout">
            {tasks.map((task, index) => (
              <motion.tr
                key={task.id}
                custom={index}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={tableRowVariants}
                layout
                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
              >
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>{task.description}</TableCell>
                <TableCell>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Badge 
                      className={`${getStatusColor(task.status)} cursor-pointer min-w-[60px] text-center inline-flex justify-center items-center`}
                      onClick={(e) => handleStatusClick(task.id, task.status, e)}
                    >
                      {task.status}
                    </Badge>
                  </motion.div>
                </TableCell>
                {showProject && <TableCell>{getProjectName(task.projectId)}</TableCell>}
                {showAuthor && <TableCell>{task.username || "Unknown"}</TableCell>}
                {showActions && (
                  <TableCell className="space-x-2">
                    {onEdit && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            style={{ display: 'inline-block' }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(task)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </motion.div>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            style={{ display: 'inline-block' }}
                          >
                            <Button
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>NO</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(task.id)}>
                              YES
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                )}
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </>
  );
}