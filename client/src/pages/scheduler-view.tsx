import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery } from "@tanstack/react-query";
import { Task, Project } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, DownloadCloud, Save, Trash2, Loader2, DatabaseIcon } from "lucide-react";

export default function SchedulerView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backupRange, setBackupRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: addDays(new Date(), 7)
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/date", selectedDate?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/date?date=${selectedDate?.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!selectedDate,
  });

  // Filter tasks for the selected date and organize by project
  const tasksByProject = tasks?.reduce((acc, task) => {
    const projectId = task.projectId || "unassigned";
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<string | number, Task[]>);

  // Get list of project IDs that have tasks for the selected date
  const projectIdsWithTasks = Object.keys(tasksByProject || {}).map(id =>
    id === "unassigned" ? null : parseInt(id)
  );

  // Filter projects to only show those with tasks
  const projectsWithTasks = projects?.filter(project =>
    projectIdsWithTasks.includes(project.id)
  );

  const handleBackupClick = () => {
    setBackupRange({
      from: new Date(),
      to: addDays(new Date(), 7)
    });
    setBackupDialogOpen(true);
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      
      // Format dates for the API
      const startDateStr = backupRange.from.toISOString();
      const endDateStr = backupRange.to.toISOString();
      
      // Create URL with query parameters
      const url = `/api/backup/tasks?startDate=${startDateStr}&endDate=${endDateStr}`;
      
      // Create a hidden link element to trigger the download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `tasks_backup_${format(backupRange.from, 'yyyy-MM-dd')}_to_${format(backupRange.to, 'yyyy-MM-dd')}.xlsx`;
      
      // Append to body, click to download, then remove
      document.body.appendChild(a);
      a.click();
      
      // Small timeout to ensure download begins before removing
      setTimeout(() => {
        document.body.removeChild(a);
        setIsExporting(false);
        setBackupDialogOpen(false);
        
        // Show success toast
        toast({
          title: "Export Successful",
          description: "Task data has been exported successfully. Would you like to delete this data?",
          duration: 5000
        });
        
        // Set exported date range for potential deletion
        setExportedCount(tasks?.length || 0);
        setDeleteDialogOpen(true);
      }, 1000);
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
      
      toast({
        title: "Export Failed",
        description: "There was an error exporting the task data. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteData = async () => {
    try {
      setIsDeleting(true);
      
      // Format dates for the API
      const startDateStr = backupRange.from.toISOString();
      const endDateStr = backupRange.to.toISOString();
      
      // Send delete request
      const response = await fetch(`/api/backup/tasks?startDate=${startDateStr}&endDate=${endDateStr}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete tasks");
      }
      
      const result = await response.json();
      
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      
      toast({
        title: "Tasks Deleted",
        description: `Successfully deleted ${result.count} tasks.`,
      });
      
      // Refetch tasks to update view
      window.location.reload();
    } catch (error) {
      console.error("Delete failed:", error);
      setIsDeleting(false);
      
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the task data. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 lg:ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Schedule View</h1>
            {user?.isAdmin && (
              <Button 
                variant="outline" 
                onClick={handleBackupClick}
                className="flex items-center gap-2"
              >
                <DatabaseIcon className="h-4 w-4" />
                <span>Backup</span>
              </Button>
            )}
          </div>

          <div className="space-y-8">
            {/* Calendar Section - Centered */}
            <div className="flex justify-center">
              <Card className="w-full max-w-sm">
                <CardContent className="flex justify-center pt-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Tasks By Project Section */}
            <div className="space-y-4 overflow-x-hidden">
              {projectsWithTasks?.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskList
                      tasks={tasksByProject?.[project.id] || []}
                      projects={projects}
                      isLoading={isLoading}
                      showActions={false}
                      showProject={false}
                      showAuthor={true}
                      alwaysShowHeader={true}
                    />
                  </CardContent>
                </Card>
              ))}

              {/* Unassigned Tasks */}
              {tasksByProject?.["unassigned"] &&
                tasksByProject["unassigned"].length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Unassigned Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TaskList
                        tasks={tasksByProject["unassigned"]}
                        projects={projects}
                        isLoading={isLoading}
                        showActions={false}
                        showProject={false}
                        showAuthor={true}
                        alwaysShowHeader={true}
                      />
                    </CardContent>
                  </Card>
                )}

              {!isLoading &&
                (!tasksByProject || Object.keys(tasksByProject).length === 0) && (
                  <p className="text-center text-muted-foreground">
                    No tasks found for {format(selectedDate, "MMMM d, yyyy")} (KST)
                  </p>
                )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Backup Tasks</DialogTitle>
            <DialogDescription>
              Select a date range to backup tasks as an Excel file
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="mb-2 text-sm font-medium">Start Date</h3>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={backupRange.from}
                    onSelect={(date) => date && setBackupRange(prev => ({ ...prev, from: date }))}
                    className="rounded-md border"
                    styles={{
                      caption_label: { fontSize: '0.9rem' },
                      cell: { width: '32px', height: '32px' },
                      button: { width: '30px', height: '30px', fontSize: '0.85rem' }
                    }}
                  />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">End Date</h3>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={backupRange.to}
                    onSelect={(date) => date && setBackupRange(prev => ({ ...prev, to: date }))}
                    className="rounded-md border"
                    styles={{
                      caption_label: { fontSize: '0.9rem' },
                      cell: { width: '32px', height: '32px' },
                      button: { width: '30px', height: '30px', fontSize: '0.85rem' }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will export tasks created between {format(backupRange.from, "MMMM d, yyyy")} and {format(backupRange.to, "MMMM d, yyyy")}.
                </AlertDescription>
              </Alert>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="button" 
              onClick={handleExportData}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="h-4 w-4" />
                  <span>Download</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delete Exported Data?</DialogTitle>
            <DialogDescription>
              Would you like to delete the exported tasks from the database?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This action is permanent and cannot be undone. All tasks from {format(backupRange.from, "MMMM d, yyyy")} to {format(backupRange.to, "MMMM d, yyyy")} will be deleted.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Keep Data
              </Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDeleteData}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Data</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}