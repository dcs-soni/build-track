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
  ArrowUpRight,
  Copy,
  Check,
  Link2,
} from "lucide-react";
import {
  api,
  projectUpdatesApi,
  projectsApi,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@buildtrack/shared";
import type { LucideIcon } from "lucide-react";
import type { AxiosError } from "axios";

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

interface ClientPortalResponse {
  accessToken: string;
  portalUrl: string;
}

const TASK_STATUS_COLORS: Record<string, string> = {
  completed: "bg-[#4A9079]",
  in_progress: "bg-[#A68B5B]",
  todo: "bg-[#3A3A3A]",
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);
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

  const enablePortalMutation = useMutation({
    mutationFn: async (): Promise<ClientPortalResponse> => {
      const response = await api.post<{ data: ClientPortalResponse }>(
        `/client/projects/${id!}/enable`,
      );
      return response.data.data;
    },
    onSuccess: (response: ClientPortalResponse) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setPortalLink(response.portalUrl);
      setPortalLinkCopied(false);
    },
  });

  const regeneratePortalMutation = useMutation({
    mutationFn: async (): Promise<ClientPortalResponse> => {
      const response = await api.post<{ data: ClientPortalResponse }>(
        `/client/projects/${id!}/regenerate`,
      );
      return response.data.data;
    },
    onSuccess: (response: ClientPortalResponse) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setPortalLink(response.portalUrl);
      setPortalLinkCopied(false);
    },
  });

  const disablePortalMutation = useMutation({
    mutationFn: () => api.post(`/client/projects/${id!}/disable`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setPortalLink(null);
      setPortalLinkCopied(false);
    },
  });

  const project = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A68B5B] border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-[#4A5568] hover:text-[#A68B5B] mb-4 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A]">
          <h3 className="text-white font-medium">Project not found</h3>
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

  const STATUS_STYLES: Record<string, string> = {
    planning: "bg-[#4A5568]/20 text-[#718096]",
    active: "bg-[#A68B5B]/20 text-[#A68B5B]",
    on_hold: "bg-[#9E534F]/20 text-[#D4796E]",
    completed: "bg-[#4A9079]/20 text-[#4A9079]",
    cancelled: "bg-[#9E534F]/20 text-[#9E534F]",
  };

  const copyPortalLink = async () => {
    if (!portalLink) return;

    try {
      await navigator.clipboard.writeText(portalLink);
      setPortalLinkCopied(true);
    } catch {
      setPortalLinkCopied(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-[#4A5568] hover:text-[#A68B5B] mb-6 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
              Project Detail
            </p>
            <h1 className="text-2xl font-medium text-white tracking-tight mb-2">
              {project.name}
            </h1>
            <p className="text-sm text-[#4A5568]">
              {project.description || "No description"}
            </p>
            {project.address && (
              <div className="flex items-center gap-2 mt-3 text-xs text-[#4A5568]">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                {project.address}, {project.city}
              </div>
            )}
          </div>
          <span
            className={`px-3 py-1 text-xs font-medium tracking-wide uppercase ${STATUS_STYLES[project.status] || STATUS_STYLES.planning}`}
          >
            {project.status}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-xs tracking-[0.1em] text-[#4A5568] uppercase">
              Overall Progress
            </span>
            <span className="text-sm text-white font-medium">{progress}%</span>
          </div>
          <div className="h-1 bg-[#1A1A1A] overflow-hidden">
            <div
              className="h-full bg-[#A68B5B] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 pt-6 border-t border-[#1A1A1A] flex gap-4">
          <Link
            to={`/projects/${id}/budget`}
            className="text-xs text-[#4A5568] hover:text-[#A68B5B] transition-colors flex items-center gap-1 tracking-wide uppercase"
          >
            Budget Analytics <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to={`/projects/${id}/reports`}
            className="text-xs text-[#4A5568] hover:text-[#A68B5B] transition-colors flex items-center gap-1 tracking-wide uppercase"
          >
            Daily Reports <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to={`/projects/${id}/timeline`}
            className="text-xs text-[#4A5568] hover:text-[#A68B5B] transition-colors flex items-center gap-1 tracking-wide uppercase"
          >
            Timeline <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to={`/projects/${id}/inspections`}
            className="text-xs text-[#4A5568] hover:text-[#A68B5B] transition-colors flex items-center gap-1 tracking-wide uppercase"
          >
            Inspections <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to={`/projects/${id}/punch-list`}
            className="text-xs text-[#4A5568] hover:text-[#A68B5B] transition-colors flex items-center gap-1 tracking-wide uppercase"
          >
            Punch List <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            to={`/projects/${id}/safety-incidents`}
            className="text-xs text-[#4A5568] hover:text-[#A68B5B] transition-colors flex items-center gap-1 tracking-wide uppercase"
          >
            Safety <ArrowUpRight className="h-3 w-3" />
          </Link>
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
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden">
        <div className="p-6 border-b border-[#1A1A1A]">
          <h2 className="text-sm font-medium text-white">Tasks</h2>
        </div>
        {tasksTotal === 0 ? (
          <div className="p-12 text-center text-[#4A5568] text-sm">
            No tasks yet
          </div>
        ) : (
          <div className="divide-y divide-[#1A1A1A]">
            {project.tasks?.map((task: TaskItem) => (
              <div
                key={task.id}
                className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.todo}`}
                  />
                  <span
                    className={
                      task.status === "completed"
                        ? "line-through text-[#3A3A3A]"
                        : "text-white text-sm"
                    }
                  >
                    {task.title}
                  </span>
                </div>
                <span className="text-xs text-[#4A5568] tracking-wide uppercase">
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Updates */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] mt-6">
        <div className="p-6 border-b border-[#1A1A1A] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-white">Client Portal</h2>
            <p className="text-xs text-[#4A5568] mt-1">
              Generate a secure read-only project link for clients.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {project.clientAccessEnabled ? (
              <>
                <button
                  onClick={() => regeneratePortalMutation.mutate()}
                  disabled={regeneratePortalMutation.isPending}
                  className="px-4 py-2 text-xs tracking-[0.1em] uppercase border border-[#1A1A1A] text-[#A68B5B] hover:border-[#A68B5B]/40 transition-colors disabled:opacity-50"
                >
                  {regeneratePortalMutation.isPending
                    ? "Regenerating..."
                    : "Regenerate Link"}
                </button>
                <button
                  onClick={() => disablePortalMutation.mutate()}
                  disabled={disablePortalMutation.isPending}
                  className="px-4 py-2 text-xs tracking-[0.1em] uppercase border border-[#1A1A1A] text-[#D4796E] hover:border-[#9E534F] transition-colors disabled:opacity-50"
                >
                  {disablePortalMutation.isPending
                    ? "Disabling..."
                    : "Disable Access"}
                </button>
              </>
            ) : (
              <button
                onClick={() => enablePortalMutation.mutate()}
                disabled={enablePortalMutation.isPending}
                className="px-4 py-2 text-xs tracking-[0.1em] uppercase border border-[#A68B5B] text-[#A68B5B] hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-300 disabled:opacity-50"
              >
                {enablePortalMutation.isPending
                  ? "Enabling..."
                  : "Enable Client Access"}
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          {portalLink ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white">Fresh client link ready</p>
                  <p className="text-xs text-[#4A5568] mt-1">
                    Share this URL directly with the client.
                  </p>
                </div>
                <button
                  onClick={copyPortalLink}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-[#A68B5B]/30 text-[#A68B5B] text-xs uppercase tracking-[0.1em] hover:bg-[#A68B5B]/10 transition-colors"
                >
                  {portalLinkCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {portalLinkCopied ? "Copied" : "Copy Link"}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 border border-[#1A1A1A] bg-[#111111] px-3 py-2 text-xs text-[#E1E1E1]">
                <Link2 className="h-3.5 w-3.5 text-[#A68B5B]" />
                <span className="truncate">{portalLink}</span>
              </div>
            </>
          ) : project.clientAccessEnabled ? (
            <p className="text-sm text-[#718096]">
              Client access is enabled. Regenerate the link to issue a new URL.
            </p>
          ) : (
            <p className="text-sm text-[#718096]">
              Client access is currently disabled for this project.
            </p>
          )}
        </div>
      </div>

      {/* Project Updates */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] mt-6">
        <div className="p-6 border-b border-[#1A1A1A] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">Project Updates</h2>
            <p className="text-xs text-[#4A5568] mt-1">
              Share status updates with your team or clients.
            </p>
          </div>
          <button
            onClick={() => setShowUpdateForm((prev) => !prev)}
            className="px-4 py-2 text-xs tracking-[0.1em] uppercase border border-[#1A1A1A] text-[#4A5568] hover:text-white hover:border-[#2A2A2A] transition-all duration-300"
          >
            {showUpdateForm ? "Cancel" : "New Update"}
          </button>
        </div>

        {showUpdateForm && (
          <div className="p-6 border-b border-[#1A1A1A]">
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
              {createUpdateMutation.isError && (
                <div className="p-3 bg-[#9E534F]/10 border border-[#9E534F]/30 text-sm text-[#D4796E]">
                  {(
                    createUpdateMutation.error as AxiosError<{
                      error?: { message?: string };
                    }>
                  )?.response?.data?.error?.message ||
                    "Failed to publish update"}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase">
                  Title
                </label>
                <input
                  name="title"
                  required
                  className="mt-2 w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                  placeholder="Weekly progress update"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase">
                  Update
                </label>
                <textarea
                  name="body"
                  required
                  rows={4}
                  className="mt-2 w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors resize-none"
                  placeholder="Share the latest milestones, risks, and next steps."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase">
                  Audience
                </label>
                <select
                  name="audience"
                  className="mt-2 w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                  defaultValue="internal"
                >
                  <option value="internal">Internal team</option>
                  <option value="client">Client portal</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={createUpdateMutation.isPending}
                className="px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] disabled:opacity-50 transition-colors duration-300"
              >
                {createUpdateMutation.isPending
                  ? "Publishing..."
                  : "Publish Update"}
              </button>
            </form>
          </div>
        )}

        <div className="divide-y divide-[#1A1A1A]">
          {updatesQuery.isLoading ? (
            <div className="p-6 text-[#4A5568] text-sm">Loading updates...</div>
          ) : updatesQuery.data?.data?.data?.length ? (
            updatesQuery.data.data.data.map((update: UpdateItem) => (
              <div key={update.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white text-sm">
                      {update.title}
                    </h3>
                    <p className="text-xs text-[#4A5568] mt-1">
                      {update.author?.name || "Unknown"} ·{" "}
                      {new Date(update.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 tracking-wide uppercase ${
                      update.audience === "client"
                        ? "bg-[#4A9079]/20 text-[#4A9079]"
                        : "bg-[#4A5568]/20 text-[#4A5568]"
                    }`}
                  >
                    {update.audience === "client" ? "Client" : "Internal"}
                  </span>
                </div>
                <p className="text-sm text-[#E1E1E1] mt-3 whitespace-pre-line">
                  {update.body}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-[#4A5568] text-sm">
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
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 border border-[#2A2A2A] flex items-center justify-center text-[#4A5568]">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs tracking-[0.15em] text-[#4A5568] uppercase">
            {label}
          </p>
          <p className="text-lg font-medium text-white tracking-tight">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
