import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, CloudSun, Users, FileText, Check } from "lucide-react";
import { api } from "@/lib/api";

export function DailyReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Daily Reports</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          New Report
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900">No reports yet</h3>
          <p className="text-gray-500">Create your first daily report.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {new Date(report.reportDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      By {report.author?.name || "Unknown"}
                    </p>
                  </div>
                </div>
                {report.supervisorSignOff ? (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    <Check className="h-4 w-4" />
                    Signed Off
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                    Pending Sign-off
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                {report.weather && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CloudSun className="h-4 w-4" />
                    {report.weather}{" "}
                    {report.temperature && `${report.temperature}°`}
                  </div>
                )}
                {report.workersCount && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    {report.workersCount} workers
                  </div>
                )}
              </div>

              {report.workSummary && (
                <p className="mt-3 text-sm text-gray-700 line-clamp-2">
                  {report.workSummary}
                </p>
              )}

              {report.photos?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {report.photos.slice(0, 4).map((photo: any) => (
                    <img
                      key={photo.id}
                      src={photo.thumbnailUrl || photo.url}
                      alt=""
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                  ))}
                  {report.photos.length > 4 && (
                    <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                      +{report.photos.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              New Daily Report
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate({
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
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Date *
                  </label>
                  <input
                    name="reportDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weather
                    </label>
                    <select
                      name="weather"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">Select</option>
                      <option value="sunny">Sunny</option>
                      <option value="cloudy">Cloudy</option>
                      <option value="rainy">Rainy</option>
                      <option value="snowy">Snowy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temp (°F)
                    </label>
                    <input
                      name="temperature"
                      type="number"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workers
                    </label>
                    <input
                      name="workersCount"
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Summary
                  </label>
                  <textarea
                    name="workSummary"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="Describe work completed today..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issues/Delays
                  </label>
                  <textarea
                    name="issues"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="Any issues or delays encountered..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Safety Notes
                  </label>
                  <textarea
                    name="safetyNotes"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="Safety observations..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
