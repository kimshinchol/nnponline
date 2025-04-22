import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type InsertTask, type Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";

interface TaskFormProps {
  onSubmit: (data: InsertTask) => void;
  projects: { id: number; name: string }[];
  isLoading?: boolean;
  initialData?: Task;
  isCoWork?: boolean;
}

export function TaskForm({ onSubmit, projects, isLoading, initialData, isCoWork }: TaskFormProps) {
  const [showRecentTasks, setShowRecentTasks] = useState(false);

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: (initialData?.status as "작업전" | "작업중" | "완료") || "작업전",
      projectId: initialData?.projectId || projects[0]?.id || 0,
      isCoWork: isCoWork || false,
    },
  });

  // 최근 10개 태스크를 가져오는 쿼리
  const { data: recentTasks, isLoading: loadingRecentTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/recent"],
    enabled: showRecentTasks,
  });

  const handleCopyTask = (task: Task) => {
    form.setValue("title", task.title);
    form.setValue("description", task.description || "");
    form.setValue("projectId", task.projectId || projects[0]?.id || 0);
    setShowRecentTasks(false);
  };

  const handleSubmit = (data: InsertTask) => {
    onSubmit({
      ...data,
      projectId: Number(data.projectId),
      description: data.description || null,
      isCoWork: isCoWork || false,
    });
  };

  // 프로젝트 이름 조회 함수
  const getProjectName = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || "알 수 없음";
  };

  return (
    <>
      <Dialog open={showRecentTasks} onOpenChange={setShowRecentTasks}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>최근 작업 복사</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {loadingRecentTasks ? (
                <p className="text-sm text-muted-foreground">최근 작업 불러오는 중...</p>
              ) : recentTasks?.length ? (
                recentTasks.map((task) => (
                  <Button
                    key={task.id}
                    variant="outline"
                    className="w-full justify-start text-left flex items-start h-auto py-2 px-3"
                    onClick={() => handleCopyTask(task)}
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="font-medium text-primary mb-1 truncate">{task.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {getProjectName(task.projectId)}
                      </div>
                    </div>
                    <Copy className="h-4 w-4 ml-2 flex-shrink-0 text-muted-foreground" />
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">최근 작업 내역이 없습니다.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>제목</FormLabel>
                <FormControl>
                  <Input placeholder="작업 제목" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>내용</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="작업 내용"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>프로젝트 (필수)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                  defaultValue={projects[0]?.id.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="프로젝트 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowRecentTasks(true)}
            >
              작업 복사
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "저장 중..." : initialData ? "작업 수정" : "작업 생성"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}