import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export function ProjectTimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["timeline", projectId],
    queryFn: () => api.get(`/timeline/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: overdueData } = useQuery({
    queryKey: ["timeline-overdue", projectId],
    queryFn: () => api.get(`/timeline/projects/${projectId}/overdue`),
    enabled: !!projectId,
  });

  const timelineData = data?.data?.data;
  const overdueTasks = overdueData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!timelineData) {
    return (
      <div className="text-center py-12 text-gray-500">
        No timeline data available
      </div>
    );
  }

  const { project, tasks, summary } = timelineData;

  // Calculate timeline range
  const startDate = project.startDate
    ? new Date(project.startDate)
    : new Date();
  const endDate = project.endDate
    ? new Date(project.endDate)
    : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const getTaskPosition = (task: any) => {
    if (!task.start) return { left: 0, width: 10 };
    const taskStart = new Date(task.start);
    const taskEnd = task.end
      ? new Date(task.end)
      : new Date(taskStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysDiff = Math.ceil(
      (taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const taskDuration = Math.ceil(
      (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      left: Math.max(0, (daysDiff / totalDays) * 100),
      width: Math.max(3, (taskDuration / totalDays) * 100),
    };
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Project Timeline
          </h2>
          <p className="text-sm text-gray-500">
            {project.startDate &&
              new Date(project.startDate).toLocaleDateString()}{" "}
            -{" "}
            {project.endDate && new Date(project.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span>Completed ({summary.completed})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>In Progress ({summary.inProgress})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span>Pending ({summary.pending})</span>
          </div>
          {summary.overdue > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{summary.overdue} Overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-red-800 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            Overdue Tasks
          </h3>
          <div className="space-y-2">
            {overdueTasks.slice(0, 5).map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-900">{task.title}</span>
                <span className="text-red-600">
                  {task.daysOverdue} days overdue
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Timeline Header */}
        <div className="border-b border-gray-200 p-4 flex">
          <div className="w-64 flex-shrink-0 font-medium text-gray-700">
            Task
          </div>
          <div className="flex-1 relative">
            <div className="flex justify-between text-xs text-gray-500">
              {[...Array(5)].map((_, i) => {
                const date = new Date(
                  startDate.getTime() +
                    (i / 4) * totalDays * 24 * 60 * 60 * 1000,
                );
                return (
                  <span key={i}>
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tasks */}
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No tasks with dates
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task: any) => {
              const position = getTaskPosition(task);
              return (
                <div
                  key={task.id}
                  className="flex items-center hover:bg-gray-50"
                >
                  <div className="w-64 flex-shrink-0 p-3 flex items-center gap-2">
                    {task.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <span
                      className={`text-sm ${task.status === "completed" ? "text-gray-400 line-through" : "text-gray-900"}`}
                    >
                      {task.name}
                    </span>
                  </div>
                  <div className="flex-1 p-3 relative h-10">
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full ${task.color || "bg-blue-500"}`}
                      style={{
                        left: `${position.left}%`,
                        width: `${position.width}%`,
                        minWidth: "20px",
                      }}
                    >
                      {task.progress > 0 && (
                        <div
                          className="h-full bg-white/30 rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
        <span>Drag task bars to adjust dates (coming soon)</span>
        <span>Click task to view details</span>
      </div>
    </div>
  );
}
