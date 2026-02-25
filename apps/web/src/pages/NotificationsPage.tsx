import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { notificationsApi } from "@/lib/api";

const priorityStyles: Record<string, string> = {
  low: "bg-[#2A2A2A] text-[#E1E1E1]",
  normal: "bg-[#6B8EC4]/20 text-[#6B8EC4]",
  high: "bg-[#A68B5B]/20 text-[#A68B5B]",
  urgent: "bg-[#9E534F]/20 text-[#D4796E]",
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
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Your Inbox
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-[#4A5568] mt-1">
            Stay on top of assignments and project updates.
          </p>
        </div>
        <button
          onClick={() => markAllMutation.mutate()}
          className="px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase border border-[#1A1A1A] text-[#4A5568] hover:text-[#E1E1E1] hover:border-[#2A2A2A] transition-colors duration-300"
        >
          Mark all read
        </button>
      </div>

      <div className="flex items-center gap-2">
        {(["all", "unread", "read"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 text-xs tracking-wide uppercase transition-colors duration-300 ${
              filter === value
                ? "bg-[#A68B5B] text-[#0A0A0A] font-medium"
                : "bg-[#0A0A0A] border border-[#1A1A1A] text-[#4A5568] hover:text-[#E1E1E1] hover:border-[#2A2A2A]"
            }`}
          >
            {value === "all" ? "All" : value === "unread" ? "Unread" : "Read"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {notificationsQuery.isError ? (
            <div className="text-center py-12 bg-[#0A0A0A] border border-[#9E534F]/30 text-[#D4796E]">
              <p className="font-medium">Failed to load notifications</p>
              <p className="text-sm text-[#9E534F] mt-1">
                Please try refreshing the page.
              </p>
            </div>
          ) : notificationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-[#A68B5B] border-t-transparent animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-[#0A0A0A] border border-[#1A1A1A] text-[#4A5568] text-sm">
              You are all caught up.
            </div>
          ) : (
            notifications.map((notification: NotificationItem) => (
              <div
                key={notification.id}
                className={`bg-[#0A0A0A] border p-5 transition-colors duration-300 relative overflow-hidden ${
                  notification.isRead ? "border-[#1A1A1A]" : "border-[#2A2A2A]"
                }`}
              >
                {!notification.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#A68B5B]" />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className={!notification.isRead ? "pl-2" : ""}>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] tracking-widest uppercase ${
                          priorityStyles[notification.priority ?? "normal"] ||
                          priorityStyles.normal
                        }`}
                      >
                        {notification.priority}
                      </span>
                      <span className="text-xs text-[#4A5568] tabular-nums">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3
                      className={`font-medium ${notification.isRead ? "text-[#E1E1E1]" : "text-white"}`}
                    >
                      {notification.title}
                    </h3>
                    <p className="text-sm text-[#4A5568] mt-1.5 leading-relaxed">
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
                    className={`text-xs tracking-wide uppercase transition-colors whitespace-nowrap ${
                      notification.isRead
                        ? "text-[#2A2A2A] cursor-default"
                        : "text-[#4A5568] hover:text-[#A68B5B]"
                    }`}
                  >
                    {notification.isRead ? "Read" : "Mark read"}
                  </button>
                </div>
                {notification.link && (
                  <div className={`mt-4 ${!notification.isRead ? "pl-2" : ""}`}>
                    <Link
                      to={notification.link}
                      className="text-xs text-[#6B8EC4] hover:text-[#4A9079] uppercase tracking-wide flex items-center gap-1 transition-colors w-fit"
                    >
                      View details <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 h-fit">
          <h2 className="text-sm font-medium text-white mb-6 tracking-wide uppercase">
            Notification Settings
          </h2>
          {preferencesQuery.isError ? (
            <div className="text-sm text-[#D4796E] bg-[#9E534F]/10 border border-[#9E534F]/20 p-4">
              <p className="font-medium">Failed to load preferences</p>
              <p className="text-xs mt-1 text-[#9E534F]">
                Please try refreshing the page.
              </p>
            </div>
          ) : !preferences ? (
            <div className="text-sm text-[#4A5568]">Loading preferences...</div>
          ) : (
            <div className="space-y-4 text-sm text-[#E1E1E1]">
              <label className="flex items-center justify-between group cursor-pointer">
                <span className="group-hover:text-white transition-colors">
                  In-app notifications
                </span>
                <input
                  type="checkbox"
                  checked={preferences.inAppEnabled}
                  className="accent-[#A68B5B] w-4 h-4 bg-[#111111] border-[#2A2A2A]"
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      inAppEnabled: e.target.checked,
                    })
                  }
                />
              </label>
              <div className="w-full h-px bg-[#1A1A1A]" />
              <label className="flex items-center justify-between group cursor-pointer">
                <span className="group-hover:text-white transition-colors">
                  Task assignments
                </span>
                <input
                  type="checkbox"
                  checked={preferences.notifyTaskAssigned}
                  className="accent-[#A68B5B] w-4 h-4 bg-[#111111] border-[#2A2A2A]"
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      notifyTaskAssigned: e.target.checked,
                    })
                  }
                />
              </label>
              <div className="w-full h-px bg-[#1A1A1A]" />
              <label className="flex items-center justify-between group cursor-pointer">
                <span className="group-hover:text-white transition-colors">
                  RFI assignments
                </span>
                <input
                  type="checkbox"
                  checked={preferences.notifyRfiAssigned}
                  className="accent-[#A68B5B] w-4 h-4 bg-[#111111] border-[#2A2A2A]"
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      notifyRfiAssigned: e.target.checked,
                    })
                  }
                />
              </label>
              <div className="w-full h-px bg-[#1A1A1A]" />
              <label className="flex items-center justify-between group cursor-pointer">
                <span className="group-hover:text-white transition-colors">
                  RFI responses
                </span>
                <input
                  type="checkbox"
                  checked={preferences.notifyRfiResponse}
                  className="accent-[#A68B5B] w-4 h-4 bg-[#111111] border-[#2A2A2A]"
                  onChange={(e) =>
                    updatePreferencesMutation.mutate({
                      notifyRfiResponse: e.target.checked,
                    })
                  }
                />
              </label>
              <div className="w-full h-px bg-[#1A1A1A]" />
              <label className="flex items-center justify-between group cursor-pointer">
                <span className="group-hover:text-white transition-colors">
                  Project updates
                </span>
                <input
                  type="checkbox"
                  checked={preferences.notifyProjectUpdates}
                  className="accent-[#A68B5B] w-4 h-4 bg-[#111111] border-[#2A2A2A]"
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
