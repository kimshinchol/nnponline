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
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserManagement } from "@/components/user-management";
import { Link } from "wouter";
import { HomeIcon } from "lucide-react";

type ArchiveFilters = {
  before?: string;
};

export default function AdminPage() {
  const { toast } = useToast();

  // Query for archived tasks
  const { data: archivedTasks } = useQuery({
    queryKey: ["/api/tasks/archived"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/archived");
      if (!response.ok) throw new Error("Failed to fetch archived tasks");
      return response.json();
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <HomeIcon className="h-4 w-4" />
            Return to Overview
          </Button>
        </Link>
      </div>

      {/* User Management Section */}
      <UserManagement />

      {/* Archive Section */}
      <Card>
        <CardHeader>
          <CardTitle>Archive Tasks</CardTitle>
          <CardDescription>Archive tasks before a specific date</CardDescription>
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
                    <FormDescription>Select a date to archive all tasks created before that date</FormDescription>
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