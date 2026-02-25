import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
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

const actionIcons: Record<string, LucideIcon> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  completed: Check,
  approved: Check,
  rejected: X,
};

const actionColors: Record<string, string> = {
  created: "bg-[#4A9079]/20 text-[#4A9079]",
  updated: "bg-[#6B8EC4]/20 text-[#6B8EC4]",
  deleted: "bg-[#9E534F]/20 text-[#D4796E]",
  completed: "bg-[#4A9079]/20 text-[#4A9079]",
  approved: "bg-[#4A9079]/20 text-[#4A9079]",
  rejected: "bg-[#9E534F]/20 text-[#D4796E]",
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
  interface ActivityEntry {
    id: string;
    createdAt: string;
    action: string;
    entityType: string;
    entityName?: string;
    user?: { name: string; avatarUrl?: string };
    project?: { id: string; name: string };
    changes?: Record<string, { old?: unknown; new?: unknown }>;
    description?: string;
  }
  const groupedActivities: Record<string, ActivityEntry[]> = {};
  activities.forEach((activity: ActivityEntry) => {
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
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="mb-6">
        <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
          Project History
        </p>
        <h1 className="text-3xl font-medium text-white tracking-tight flex items-center gap-3">
          <Activity className="h-6 w-6 text-[#A68B5B]" />
          Activity Timeline
        </h1>
        <p className="text-sm text-[#4A5568] mt-1">
          Track all changes and updates
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[#A68B5B] border-t-transparent animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 bg-[#0A0A0A] border border-[#1A1A1A]">
          <Activity className="h-12 w-12 text-[#2A2A2A] mx-auto mb-4" />
          <h3 className="font-medium text-white mb-2">No activity yet</h3>
          <p className="text-sm text-[#4A5568]">
            Changes to projects will appear here.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-4 bottom-0 w-px bg-[#1A1A1A]" />

          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-[#A68B5B] mb-4 ml-14 tracking-wide uppercase">
                  {date}
                </h3>
                <div className="space-y-4">
                  {dateActivities.map((activity: ActivityEntry) => {
                    const ActionIcon = actionIcons[activity.action] || Edit;
                    const colorClass =
                      actionColors[activity.action] ||
                      "bg-[#2A2A2A] text-[#E1E1E1]";
                    const changes = activity.changes as Record<
                      string,
                      { old?: unknown; new?: unknown }
                    >;
                    const changedFields = Object.keys(changes || {});

                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div
                          className={`relative z-10 h-10 w-10 border border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-center flex-shrink-0 mt-1`}
                        >
                          <div className={`p-1.5 ${colorClass}`}>
                            <ActionIcon className="h-4 w-4" strokeWidth={1.5} />
                          </div>
                        </div>
                        <div className="flex-1 bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-colors duration-300">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[#E1E1E1] text-sm">
                                <span className="font-medium text-white">
                                  {activity.user?.name || "Unknown"}
                                </span>{" "}
                                <span className="text-[#4A5568]">
                                  {activity.action}
                                </span>{" "}
                                <span className="font-medium">
                                  {activity.entityType}
                                </span>
                                {activity.entityName && (
                                  <span className="text-[#A68B5B]">
                                    {" "}
                                    "{activity.entityName}"
                                  </span>
                                )}
                              </p>
                              {activity.project && !projectId && (
                                <Link
                                  to={`/projects/${activity.project.id}`}
                                  className="text-xs text-[#6B8EC4] hover:text-[#4A9079] transition-colors flex items-center gap-1 mt-2 uppercase tracking-wide"
                                >
                                  {activity.project.name}{" "}
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                            </div>
                            <span className="text-xs text-[#4A5568] whitespace-nowrap tabular-nums">
                              {new Date(activity.createdAt).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          {/* Show changes if available */}
                          {changedFields.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#1A1A1A] space-y-2">
                              {changedFields.slice(0, 3).map((field) => (
                                <div
                                  key={field}
                                  className="text-sm text-[#A68B5B] flex items-center gap-3"
                                >
                                  <span className="font-medium tracking-wide uppercase text-xs">
                                    {field}:
                                  </span>
                                  {changes[field].old !== undefined && (
                                    <>
                                      <span className="text-[#9E534F] line-through decoration-[#9E534F]/50">
                                        {String(changes[field].old)}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-[#4A5568]" />
                                    </>
                                  )}
                                  <span className="text-[#4A9079]">
                                    {String(changes[field].new)}
                                  </span>
                                </div>
                              ))}
                              {changedFields.length > 3 && (
                                <p className="text-xs text-[#4A5568] tracking-wide uppercase mt-2">
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
