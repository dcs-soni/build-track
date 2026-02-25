import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Calendar,
  CloudSun,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { api, projectsApi } from "@/lib/api";
import type { AxiosError } from "axios";

/** Strip empty-string values so optional fields don't fail Zod validation */
function sanitizeFormData(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== "" && value !== null && value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

interface DailyReportItem {
  id: string;
  reportDate: string;
  workSummary?: string;
  weather?: string;
  temperature?: number;
  workersCount?: number;
  supervisorSignOff?: boolean;
  author?: { name: string; avatarUrl?: string };
  photos?: { id: string; url: string; thumbnailUrl?: string }[];
}

interface ProjectOption {
  id: string;
  name: string;
}

export function DailyReportsPage() {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  // Resolve which projectId to use — route param takes priority
  const projectId = routeProjectId || selectedProjectId;

  // Fetch projects list for the selector (only when no route param)
  const { data: projectsData } = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => projectsApi.list({ limit: "100" }),
    enabled: !routeProjectId,
  });
  const projects: ProjectOption[] = projectsData?.data?.data?.items || [];

  const { data, isLoading } = useQuery({
    queryKey: ["daily-reports", projectId],
    queryFn: () => api.get(`/daily-reports/projects/${projectId}`),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/daily-reports", { ...data, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      setShowCreate(false);
    },
  });

  const reports = data?.data?.data?.items || [];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Field Reports
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Daily Reports
          </h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!projectId}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-300"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Report
        </button>
      </div>

      {/* Project Selector (only on top-level /daily-reports route) */}
      {!routeProjectId && (
        <div className="mb-8">
          <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
            Select Project
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
          >
            <option value="">Choose a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!projectId ? (
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A]">
          <FileText
            className="h-12 w-12 text-[#2A2A2A] mx-auto mb-4"
            strokeWidth={1}
          />
          <h3 className="font-medium text-white mb-2">
            Select a project to view reports
          </h3>
          <p className="text-[#4A5568] text-sm">
            Choose a project from the dropdown above.
          </p>
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center text-[#4A5568]">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A]">
          <FileText
            className="h-12 w-12 text-[#2A2A2A] mx-auto mb-4"
            strokeWidth={1}
          />
          <h3 className="font-medium text-white mb-2">No reports yet</h3>
          <p className="text-[#4A5568] text-sm">
            Create your first daily report.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report: DailyReportItem) => (
            <div
              key={report.id}
              className="group bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-all duration-500"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 border border-[#2A2A2A] flex items-center justify-center text-[#A68B5B]">
                    <Calendar className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {new Date(report.reportDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-[#4A5568] mt-0.5">
                      By {report.author?.name || "Unknown"}
                    </p>
                  </div>
                </div>
                {report.supervisorSignOff ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#4A9079]/20 text-[#4A9079] tracking-wide uppercase">
                    <CheckCircle className="h-3 w-3" />
                    Signed Off
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#A68B5B]/20 text-[#A68B5B] tracking-wide uppercase">
                    <AlertTriangle className="h-3 w-3" />
                    Pending
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                {report.weather && (
                  <div className="flex items-center gap-2 text-sm text-[#4A5568]">
                    <CloudSun className="h-4 w-4" strokeWidth={1.5} />
                    {report.weather}{" "}
                    {report.temperature && `${report.temperature}°`}
                  </div>
                )}
                {report.workersCount && (
                  <div className="flex items-center gap-2 text-sm text-[#4A5568]">
                    <Users className="h-4 w-4" strokeWidth={1.5} />
                    {report.workersCount} workers
                  </div>
                )}
              </div>

              {report.workSummary && (
                <p className="mt-3 text-sm text-[#E1E1E1] line-clamp-2">
                  {report.workSummary}
                </p>
              )}

              {(report.photos?.length ?? 0) > 0 && (
                <div className="mt-3 flex gap-2">
                  {report.photos?.slice(0, 4).map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.thumbnailUrl || photo.url}
                      alt=""
                      className="h-16 w-16 object-cover border border-[#1A1A1A]"
                    />
                  ))}
                  {(report.photos?.length ?? 0) > 4 && (
                    <div className="h-16 w-16 bg-[#1A1A1A] flex items-center justify-center text-[#4A5568] text-sm">
                      +{(report.photos?.length ?? 0) - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && projectId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1A1A1A] w-full max-w-lg p-6">
            <h2 className="text-lg font-medium text-white mb-1">
              New Daily Report
            </h2>
            <p className="text-xs text-[#4A5568] mb-6">
              Document today's field activity
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate(
                  sanitizeFormData({
                    reportDate: formData.get("reportDate"),
                    weather: formData.get("weather"),
                    temperature: formData.get("temperature")
                      ? Number(formData.get("temperature"))
                      : undefined,
                    workersCount: formData.get("workersCount")
                      ? Number(formData.get("workersCount"))
                      : undefined,
                    workSummary: formData.get("workSummary"),
                    issues: formData.get("issues"),
                    safetyNotes: formData.get("safetyNotes"),
                  }),
                );
              }}
            >
              {createMutation.isError && (
                <div className="mb-4 p-3 bg-[#9E534F]/10 border border-[#9E534F]/30 text-sm text-[#D4796E]">
                  {(
                    createMutation.error as AxiosError<{
                      error?: { message?: string };
                    }>
                  )?.response?.data?.error?.message ||
                    "Failed to create report"}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Report Date *
                  </label>
                  <input
                    name="reportDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                      Weather
                    </label>
                    <select
                      name="weather"
                      className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                    >
                      <option value="">Select</option>
                      <option value="sunny">Sunny</option>
                      <option value="cloudy">Cloudy</option>
                      <option value="rainy">Rainy</option>
                      <option value="snowy">Snowy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                      Temp (°F)
                    </label>
                    <input
                      name="temperature"
                      type="number"
                      className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                      Workers
                    </label>
                    <input
                      name="workersCount"
                      type="number"
                      min="0"
                      className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Work Summary
                  </label>
                  <textarea
                    name="workSummary"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors resize-none"
                    placeholder="Describe work completed today..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Issues/Delays
                  </label>
                  <textarea
                    name="issues"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors resize-none"
                    placeholder="Any issues or delays encountered..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Safety Notes
                  </label>
                  <textarea
                    name="safetyNotes"
                    rows={2}
                    className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors resize-none"
                    placeholder="Safety observations..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-[#1A1A1A] text-[#E1E1E1] text-sm hover:bg-white/[0.03] hover:border-[#2A2A2A] transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-sm font-medium hover:bg-[#8A7048] disabled:opacity-50 transition-colors duration-300"
                >
                  {createMutation.isPending ? "Creating..." : "Create Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
