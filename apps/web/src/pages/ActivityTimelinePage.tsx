import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";

const actionIcons: Record<string, any> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  completed: Check,
  approved: Check,
  rejected: X,
};

const actionColors: Record<string, string> = {
  created: "bg-green-100 text-green-600",
  updated: "bg-blue-100 text-blue-600",
  deleted: "bg-red-100 text-red-600",
  completed: "bg-green-100 text-green-600",
  approved: "bg-green-100 text-green-600",
  rejected: "bg-red-100 text-red-600",
};

export function ActivityTimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["activity", projectId],
    queryFn: () =>
      projectId
        ? api.get(`/activity/projects/${projectId}`)
        : api.get("/activity/recent"),
  });

  const activities = data?.data?.data?.items || data?.data?.data || [];

  // Group activities by date
  const groupedActivities: Record<string, any[]> = {};
  activities.forEach((activity: any) => {
    const date = new Date(activity.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedActivities[date]) groupedActivities[date] = [];
    groupedActivities[date].push(activity);
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          Activity Timeline
        </h2>
        <p className="text-gray-500">Track all changes and updates</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900">No activity yet</h3>
          <p className="text-gray-500">Changes to projects will appear here.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 mb-4 ml-14">
                  {date}
                </h3>
                <div className="space-y-4">
                  {dateActivities.map((activity: any) => {
                    const ActionIcon = actionIcons[activity.action] || Edit;
                    const colorClass =
                      actionColors[activity.action] ||
                      "bg-gray-100 text-gray-600";
                    const changes = activity.changes as Record<
                      string,
                      { old?: unknown; new?: unknown }
                    >;
                    const changedFields = Object.keys(changes || {});

                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div
                          className={`relative z-10 h-10 w-10 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}
                        >
                          <ActionIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-gray-900">
                                <span className="font-medium">
                                  {activity.user?.name || "Unknown"}
                                </span>{" "}
                                <span className="text-gray-500">
                                  {activity.action}
                                </span>{" "}
                                <span className="font-medium">
                                  {activity.entityType}
                                </span>
                                {activity.entityName && (
                                  <span className="text-gray-700">
                                    {" "}
                                    "{activity.entityName}"
                                  </span>
                                )}
                              </p>
                              {activity.project && !projectId && (
                                <Link
                                  to={`/projects/${activity.project.id}`}
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                >
                                  {activity.project.name}{" "}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(activity.createdAt).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          {/* Show changes if available */}
                          {changedFields.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                              {changedFields.slice(0, 3).map((field) => (
                                <div
                                  key={field}
                                  className="text-sm text-gray-600 flex items-center gap-2"
                                >
                                  <span className="font-medium">{field}:</span>
                                  {changes[field].old !== undefined && (
                                    <>
                                      <span className="text-red-500 line-through">
                                        {String(changes[field].old)}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-gray-400" />
                                    </>
                                  )}
                                  <span className="text-green-600">
                                    {String(changes[field].new)}
                                  </span>
                                </div>
                              ))}
                              {changedFields.length > 3 && (
                                <p className="text-xs text-gray-400">
                                  +{changedFields.length - 3} more changes
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
