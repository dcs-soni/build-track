import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { notificationsApi } from "@/lib/api";

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  priority?: string;
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () =>
      notificationsApi.list({
        status: filter,
        limit: "50",
      }),
  });

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationsApi.preferences(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      notificationsApi.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  const notifications = notificationsQuery.data?.data?.data?.items || [];
  const preferences = preferencesQuery.data?.data?.data;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            Stay on top of assignments and project updates.
          </p>
        </div>
        <button
          onClick={() => markAllMutation.mutate()}
          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          Mark all read
        </button>
      </div>

      <div className="flex items-center gap-3">
        {(["all", "unread", "read"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              filter === value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {value === "all" ? "All" : value === "unread" ? "Unread" : "Read"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {notificationsQuery.isError ? (
            <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200 text-red-600">
              <p className="font-medium">Failed to load notifications</p>
              <p className="text-sm mt-1">Please try refreshing the page.</p>
            </div>
          ) : notificationsQuery.isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
              You are all caught up.
            </div>
          ) : (
            notifications.map((notification: NotificationItem) => (
              <div
                key={notification.id}
                className={`bg-white border rounded-xl p-4 ${
                  notification.isRead
                    ? "border-gray-200"
                    : "border-blue-200 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          priorityStyles[notification.priority ?? "normal"] ||
                          priorityStyles.normal
                        }`}
                      >
                        {notification.priority}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!notification.isRead) {
                        markReadMutation.mutate(notification.id);
                      }
                    }}
                    disabled={notification.isRead}
                    className={`text-xs ${
                      notification.isRead
                        ? "text-gray-400 cursor-default"
                        : "text-gray-500 hover:text-gray-900 cursor-pointer"
                    }`}
                  >
                    {notification.isRead ? "Read" : "Mark read"}
                  </button>
                </div>
                {notification.link && (
                  <div className="mt-3">
                    <Link
                      to={notification.link}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Settings
          </h2>
          {preferencesQuery.isError ? (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <p className="font-medium">Failed to load preferences</p>
              <p className="text-xs mt-1">Please try refreshing the page.</p>
            </div>
          ) : !preferences ? (
            <div className="text-sm text-gray-500">Loading preferences...</div>
          ) : (
            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between">
                <span>In-app notifications</span>
                <input
                  type="checkbox"
                  checked={preferences.inAppEnabled}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      inAppEnabled: e.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Task assignments</span>
                <input
                  type="checkbox"
                  checked={preferences.notifyTaskAssigned}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      notifyTaskAssigned: e.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between">
                <span>RFI assignments</span>
                <input
                  type="checkbox"
                  checked={preferences.notifyRfiAssigned}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      notifyRfiAssigned: e.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between">
                <span>RFI responses</span>
                <input
                  type="checkbox"
                  checked={preferences.notifyRfiResponse}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      notifyRfiResponse: e.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between">
                <span>Project updates</span>
                <input
                  type="checkbox"
                  checked={preferences.notifyProjectUpdates}
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      notifyProjectUpdates: e.target.checked,
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
