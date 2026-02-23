import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { projectUpdatesApi, projectsApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@buildtrack/shared";
import type { LucideIcon } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string;
  assignee?: { name: string };
}

interface UpdateItem {
  id: string;
  title: string;
  body?: string;
  audience?: string;
  createdAt: string;
  author?: { name: string };
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const updatesQuery = useQuery({
    queryKey: ["project-updates", id],
    queryFn: () => projectUpdatesApi.list(id!),
    enabled: !!id,
  });

  const createUpdateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      projectUpdatesApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-updates", id] });
      setShowUpdateForm(false);
    },
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
    project.tasks?.filter((t: TaskItem) => t.status === "completed").length ||
    0;
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
            {project.tasks?.map((task: TaskItem) => (
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

      {/* Project Updates */}
      <div className="bg-white rounded-xl border border-gray-200 mt-6">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Project Updates
            </h2>
            <p className="text-sm text-gray-500">
              Share status updates with your team or clients.
            </p>
          </div>
          <button
            onClick={() => setShowUpdateForm((prev) => !prev)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            {showUpdateForm ? "Cancel" : "New Update"}
          </button>
        </div>

        {showUpdateForm && (
          <div className="p-6 border-b border-gray-200">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                createUpdateMutation.mutate({
                  title: formData.get("title"),
                  body: formData.get("body"),
                  audience: formData.get("audience"),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-gray-600">Title</label>
                <input
                  name="title"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Weekly progress update"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Update</label>
                <textarea
                  name="body"
                  required
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Share the latest milestones, risks, and next steps."
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Audience</label>
                <select
                  name="audience"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  defaultValue="internal"
                >
                  <option value="internal">Internal team</option>
                  <option value="client">Client portal</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Publish update
              </button>
            </form>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {updatesQuery.isLoading ? (
            <div className="p-6 text-gray-500">Loading updates...</div>
          ) : updatesQuery.data?.data?.data?.length ? (
            updatesQuery.data.data.data.map((update: UpdateItem) => (
              <div key={update.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {update.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {update.author?.name || "Unknown"} ·{" "}
                      {new Date(update.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      update.audience === "client"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {update.audience === "client" ? "Client" : "Internal"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-3 whitespace-pre-line">
                  {update.body}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-gray-500">
              No updates have been shared yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
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
