import { Navigation } from "@/components/navigation";
import { TaskList } from "@/components/task-list";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { format } from "date-fns";

export default function SchedulerView() {
  const [selectedDate, setSelectedDate] = useState<Date>();

  const { data: projects } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/projects"],
  });

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/user", selectedDate?.toISOString()],
    enabled: !!selectedDate,
  });

  // Filter tasks for the selected date
  const filteredTasks = tasks?.filter(task => {
    if (!selectedDate) return false;
    const taskDate = new Date(task.createdAt);
    return (
      taskDate.getFullYear() === selectedDate.getFullYear() &&
      taskDate.getMonth() === selectedDate.getMonth() &&
      taskDate.getDate() === selectedDate.getDate()
    );
  });

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8 ml-64">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Schedule</h1>
          
          <div className="grid grid-cols-2 gap-8">
            {/* Calendar Section */}
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border w-full"
                />
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate
                    ? `Tasks for ${format(selectedDate, 'MMMM d, yyyy')}`
                    : 'Select a date to view tasks'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <TaskList
                    tasks={filteredTasks || []}
                    projects={projects}
                    isLoading={isLoading}
                    showActions={false}
                    showProject={true}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    Click on a date in the calendar to view tasks for that day
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
