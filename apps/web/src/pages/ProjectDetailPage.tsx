import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { projectsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@buildtrack/shared";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const project = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <h3 className="text-gray-900 font-medium">Project not found</h3>
        </div>
      </div>
    );
  }

  const tasksCompleted =
    project.tasks?.filter((t: any) => t.status === "completed").length || 0;
  const tasksTotal = project.tasks?.length || 0;
  const progress =
    tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <div className="p-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {project.name}
            </h1>
            <p className="text-gray-500">
              {project.description || "No description"}
            </p>
            {project.address && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                {project.address}, {project.city}
              </div>
            )}
          </div>
          <span
            className={`px-4 py-2 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}
          >
            {project.status}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          label="Budget"
          value={formatCurrency(Number(project.budget) || 0)}
        />
        <StatCard
          icon={Calendar}
          label="Start Date"
          value={project.startDate ? formatDate(project.startDate) : "Not set"}
        />
        <StatCard
          icon={Clock}
          label="Est. Completion"
          value={
            project.estimatedEnd ? formatDate(project.estimatedEnd) : "Not set"
          }
        />
        <StatCard
          icon={CheckCircle2}
          label="Tasks"
          value={`${tasksCompleted}/${tasksTotal}`}
        />
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        </div>
        {tasksTotal === 0 ? (
          <div className="p-12 text-center text-gray-500">No tasks yet</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {project.tasks?.map((task: any) => (
              <div
                key={task.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${task.status === "completed" ? "bg-green-500" : task.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"}`}
                  />
                  <span
                    className={
                      task.status === "completed"
                        ? "line-through text-gray-400"
                        : "text-gray-900"
                    }
                  >
                    {task.title}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{task.priority}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    planning: "bg-gray-100 text-gray-600",
    active: "bg-blue-100 text-blue-600",
    on_hold: "bg-amber-100 text-amber-600",
    completed: "bg-green-100 text-green-600",
    cancelled: "bg-red-100 text-red-600",
  };
  return colors[status] || colors.planning;
}
