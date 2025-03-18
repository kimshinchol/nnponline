import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ArchiveFilters = {
  before?: string;
  status?: string;
  projectId?: number;
};

export default function AdminPage() {
  const { toast } = useToast();
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);

  // Query for archived tasks
  const { data: archivedTasks } = useQuery({
    queryKey: ["/api/tasks/archived"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/archived");
      if (!response.ok) throw new Error("Failed to fetch archived tasks");
      return response.json();
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/backup");
      const backup = await response.json();

      // Create and download backup file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Backup Created",
        description: "Your backup file has been downloaded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupFile: File) => {
      const backup = JSON.parse(await backupFile.text());
      await apiRequest("POST", "/api/backup/restore", backup);
    },
    onSuccess: () => {
      toast({
        title: "Backup Restored",
        description: "Your data has been restored from the backup.",
      });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Archive tasks mutation
  const archiveTasksMutation = useMutation({
    mutationFn: async (filters: ArchiveFilters) => {
      const response = await apiRequest("POST", "/api/tasks/archive", filters);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tasks Archived",
        description: "Selected tasks have been archived successfully.",
      });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast({
        title: "Archive Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveForm = useForm<ArchiveFilters>();

  const onArchiveSubmit = (data: ArchiveFilters) => {
    archiveTasksMutation.mutate(data);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedBackupFile(file);
    }
  };

  const handleRestore = () => {
    if (selectedBackupFile) {
      restoreBackupMutation.mutate(selectedBackupFile);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>Create backups of your data or restore from a previous backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
            className="w-full md:w-auto"
            size="lg"
          >
            {createBackupMutation.isPending ? "Creating Backup..." : "Create Backup"}
          </Button>

          <div className="space-y-2">
            <Input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="max-w-xs"
            />
            <Button
              onClick={handleRestore}
              disabled={!selectedBackupFile || restoreBackupMutation.isPending}
              className="w-full md:w-auto"
              variant="outline"
              size="lg"
            >
              {restoreBackupMutation.isPending ? "Restoring..." : "Restore Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Archive Section */}
      <Card>
        <CardHeader>
          <CardTitle>Archive Tasks</CardTitle>
          <CardDescription>Archive old or completed tasks to keep your workspace organized</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...archiveForm}>
            <form onSubmit={archiveForm.handleSubmit(onArchiveSubmit)} className="space-y-4">
              <FormField
                control={archiveForm.control}
                name="before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Archive tasks before</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Tasks created before this date will be archived</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={archiveForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Only archive tasks with this status</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={archiveTasksMutation.isPending}
                className="w-full md:w-auto"
                size="lg"
              >
                {archiveTasksMutation.isPending ? "Archiving Tasks..." : "Archive Tasks"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Archived Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Tasks</CardTitle>
          <CardDescription>View your archived tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {archivedTasks?.map((task: any) => (
              <div
                key={task.id}
                className="p-4 border rounded-lg bg-muted"
              >
                <h3 className="font-medium">{task.title}</h3>
                <p className="text-sm text-muted-foreground">{task.description}</p>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Status: </span>
                  {task.status}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Created: </span>
                  {new Date(task.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}