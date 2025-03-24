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

interface TaskFormProps {
  onSubmit: (data: InsertTask) => void;
  projects: { id: number; name: string }[];
  isLoading?: boolean;
  initialData?: Task;
  isCoWork?: boolean;
}

export function TaskForm({ onSubmit, projects, isLoading, initialData, isCoWork }: TaskFormProps) {
  const [showPreviousTasks, setShowPreviousTasks] = useState(false);

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: initialData?.status || "작업전",
      projectId: initialData?.projectId || (projects[0]?.id ?? 0),
      isCoWork: isCoWork || false,
    },
  });

  const { data: previousTasks, isLoading: loadingPreviousTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/previous"],
    enabled: showPreviousTasks,
  });

  const handleCopyTask = (task: Task) => {
    form.setValue("title", task.title);
    form.setValue("description", task.description || "");
    form.setValue("projectId", task.projectId);
    setShowPreviousTasks(false);
  };

  const handleSubmit = (data: InsertTask) => {
    onSubmit({
      ...data,
      projectId: Number(data.projectId),
      description: data.description || null,
      isCoWork: isCoWork || false,
    });
  };

  return (
    <>
      <Dialog open={showPreviousTasks} onOpenChange={setShowPreviousTasks}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Last Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {loadingPreviousTasks ? (
              <p className="text-sm text-muted-foreground">Loading previous tasks...</p>
            ) : previousTasks?.length ? (
              previousTasks.map((task) => (
                <Button
                  key={task.id}
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => handleCopyTask(task)}
                >
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground">{task.description}</div>
                    )}
                  </div>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No previous tasks found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Task title" {...field} />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Task description"
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
                <FormLabel>Project (Required)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                  defaultValue={projects[0]?.id.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
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
              onClick={() => setShowPreviousTasks(true)}
            >
              Copy Task
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Saving..." : initialData ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}