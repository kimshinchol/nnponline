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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "./task-form";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskListProps {
  tasks: Task[];
  onStatusChange?: (taskId: number, status: string) => void;
  onCreate?: (task: any) => void;
  projects?: { id: number; name: string }[];
  showAuthor?: boolean;
  showActions?: boolean;
  showProject?: boolean;
  isLoading?: boolean;
  createLoading?: boolean;
  showCreateButton?: boolean;
  alwaysShowHeader?: boolean;
  customActions?: (task: Task) => Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }>;
}

export function TaskList({
  tasks,
  onStatusChange,
  onCreate,
  projects = [],
  showAuthor = false,
  showActions = true,
  showProject = true,
  isLoading,
  createLoading,
  showCreateButton = false,
  alwaysShowHeader = false,
  customActions,
}: TaskListProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPosition, setCelebrationPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);

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
    event.stopPropagation();
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

  if (isLoading) {
    return <div>Loading tasks...</div>;
  }

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
      <div className="w-full overflow-hidden">
        <div className="flex justify-end items-center mb-4">
          {showCreateButton && onCreate && (
            <Button
              onClick={() => setShowNewTaskDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              업무등록
            </Button>
          )}
        </div>
        <Table>
          {alwaysShowHeader && (
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">제목</TableHead>
                <TableHead className="w-[30%] hidden sm:table-cell">내용</TableHead>
                <TableHead className="w-[15%]">상태</TableHead>
                {showProject && <TableHead className="w-[15%] hidden sm:table-cell">프로젝트</TableHead>}
                {showAuthor && <TableHead className="w-[15%] hidden sm:table-cell">작성자</TableHead>}
                {showActions && <TableHead className="w-[15%]">작업</TableHead>}
              </TableRow>
            </TableHeader>
          )}
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
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <TableCell className="font-medium truncate max-w-[150px] sm:max-w-none">
                    {task.title}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="line-clamp-1">{task.description}</span>
                  </TableCell>
                  <TableCell>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Badge
                        className={`${getStatusColor(task.status)} cursor-pointer min-w-[60px] text-center inline-flex justify-center items-center text-xs sm:text-sm`}
                        onClick={(e) => handleStatusClick(task.id, task.status, e)}
                      >
                        {task.status}
                      </Badge>
                    </motion.div>
                  </TableCell>
                  {showProject && (
                    <TableCell className="hidden sm:table-cell">
                      <span className="line-clamp-1">{getProjectName(task.projectId)}</span>
                    </TableCell>
                  )}
                  {showAuthor && (
                    <TableCell className="hidden sm:table-cell">
                      <span className="line-clamp-1">{task.username || "Unknown"}</span>
                    </TableCell>
                  )}
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {customActions && customActions(task).map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick();
                            }}
                            title={action.label}
                          >
                            {action.icon}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-[min(calc(100vw-2rem),425px)]">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{selectedTask?.description || "No description"}</p>
            </div>
            {showProject && (
              <div>
                <h4 className="text-sm font-medium mb-1">Project</h4>
                <p className="text-sm text-muted-foreground">{selectedTask && getProjectName(selectedTask.projectId)}</p>
              </div>
            )}
            {showAuthor && (
              <div>
                <h4 className="text-sm font-medium mb-1">Author</h4>
                <p className="text-sm text-muted-foreground">{selectedTask?.username || "Unknown"}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium mb-1">Status</h4>
              <Badge className={`${selectedTask && getStatusColor(selectedTask.status)}`}>
                {selectedTask?.status}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>새 작업 생성</DialogTitle>
          </DialogHeader>
          <TaskForm
            onSubmit={(data) => {
              onCreate?.(data);
              setShowNewTaskDialog(false);
            }}
            projects={projects}
            isLoading={createLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}