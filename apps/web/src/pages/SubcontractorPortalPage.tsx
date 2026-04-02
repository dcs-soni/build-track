import { useState } from "react";
import {
  HardHat,
  LogIn,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Briefcase,
} from "lucide-react";

interface SubProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  trade: string;
}

interface SubTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progressPercent: number;
  dueDate?: string;
  project: { id: string; name: string };
}

const API_BASE = "/api/v1";

export function SubcontractorPortalPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<SubProfile | null>(null);
  const [tasks, setTasks] = useState<SubTask[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inFlightUpdates, setInFlightUpdates] = useState<
    Record<string, boolean>
  >({});

  const handleLogin = async () => {
    setIsLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/sub-portal/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Use the actual tenantId entered by the user
        body: JSON.stringify({ email, accessToken, tenantId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error?.message || "Login failed");
        return;
      }
      setToken(data.data.token);
      setProfile(data.data.subcontractor);
      setIsLoggedIn(true);
      await fetchTasks(data.data.token);
    } catch {
      setLoginError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/sub-portal/tasks`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch {
      // Silently handle
    }
  };

  const updateProgressLocal = (taskId: string, progressPercent: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, progressPercent } : t)),
    );
  };

  const commitProgressUpdate = async (
    taskId: string,
    progressPercent: number,
  ) => {
    // Prevent overlapping updates for the same task
    if (inFlightUpdates[taskId]) return;

    setInFlightUpdates((prev) => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch(
        `${API_BASE}/sub-portal/tasks/${taskId}/progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ progressPercent }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, progressPercent, status: data.data.status }
              : t,
          ),
        );
      }
    } catch {
      // Silently handle
    } finally {
      setInFlightUpdates((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "completed")
      return <CheckCircle className="h-4 w-4 text-[#4A9079]" />;
    if (status === "in_progress")
      return <Clock className="h-4 w-4 text-[#A68B5B]" />;
    if (status === "blocked")
      return <AlertTriangle className="h-4 w-4 text-[#9E534F]" />;
    return <Clock className="h-4 w-4 text-[#718096]" />;
  };

  // ── Login View ────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 border border-[#3A3A3A] flex items-center justify-center mx-auto mb-4">
              <HardHat className="h-8 w-8 text-[#A68B5B]" />
            </div>
            <h1 className="text-2xl text-white font-medium tracking-tight">
              Subcontractor Portal
            </h1>
            <p className="text-sm text-[#718096] mt-2">
              Access your assigned tasks and report progress
            </p>
          </div>

          <div className="bg-[#111111] border border-[#1A1A1A] p-6 space-y-5">
            <div>
              <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                Tenant (Company) ID
              </label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e.g. 123e4567-..."
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your access token"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
              />
            </div>

            {loginError && (
              <p className="text-xs text-[#9E534F]">{loginError}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={!email || !accessToken || isLoading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#A68B5B] text-[#0A0A0A] text-sm font-medium uppercase tracking-wider hover:bg-[#B89C6C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="h-4 w-4" />
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </div>

          <p className="text-center text-[10px] text-[#4A5568] mt-6 uppercase tracking-widest">
            BuildTrack • Subcontractor Access
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard View ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#0A0A0A] border-b border-[#1A1A1A] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#3A3A3A] flex items-center justify-center">
              <HardHat className="h-5 w-5 text-[#A68B5B]" />
            </div>
            <div>
              <h1 className="text-white font-medium">{profile?.companyName}</h1>
              <p className="text-[10px] text-[#4A5568] uppercase tracking-widest">
                Subcontractor Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white">{profile?.contactName}</p>
              <p className="text-xs text-[#718096]">{profile?.trade}</p>
            </div>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setToken("");
                setProfile(null);
                setTasks([]);
                setTenantId("");
                setEmail("");
                setAccessToken("");
              }}
              className="px-4 py-2 text-xs text-[#718096] hover:text-[#A68B5B] uppercase tracking-wider transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111111] border border-[#1A1A1A] p-4">
            <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1">
              Assigned Tasks
            </p>
            <p className="text-2xl text-white font-medium">{tasks.length}</p>
          </div>
          <div className="bg-[#111111] border border-[#1A1A1A] p-4">
            <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1">
              Completed
            </p>
            <p className="text-2xl text-[#4A9079] font-medium">
              {tasks.filter((t) => t.status === "completed").length}
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1A1A1A] p-4">
            <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1">
              In Progress
            </p>
            <p className="text-2xl text-[#A68B5B] font-medium">
              {tasks.filter((t) => t.status === "in_progress").length}
            </p>
          </div>
        </div>

        {/* Task List */}
        <div className="mb-4">
          <h2 className="text-sm font-medium text-white uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#A68B5B]" />
            Your Tasks
          </h2>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-[#111111] border border-[#1A1A1A] p-8 text-center">
            <User className="h-8 w-8 text-[#4A5568] mx-auto mb-3" />
            <p className="text-white mb-1">No tasks assigned</p>
            <p className="text-sm text-[#718096]">
              You don't have any tasks assigned yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#111111] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(task.status)}
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{task.title}</h3>
                      <p className="text-xs text-[#A68B5B] mt-0.5">
                        {task.project.name}
                      </p>
                      {task.description && (
                        <p className="text-xs text-[#718096] mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      {task.dueDate && (
                        <p className="text-[10px] text-[#4A5568] mt-2">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono px-2 py-1 ${
                      task.status === "completed"
                        ? "text-[#4A9079] bg-[#4A9079]/10"
                        : task.status === "in_progress"
                          ? "text-[#A68B5B] bg-[#A68B5B]/10"
                          : "text-[#718096] bg-[#718096]/10"
                    }`}
                  >
                    {task.progressPercent}%
                  </span>
                </div>

                {/* Progress slider */}
                <div className="mt-3 pt-3 border-t border-[#1A1A1A]">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-[#4A5568] uppercase tracking-wider w-16">
                      Progress
                    </span>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={task.progressPercent}
                        onChange={(e) =>
                          updateProgressLocal(task.id, Number(e.target.value))
                        }
                        onMouseUp={() =>
                          commitProgressUpdate(task.id, task.progressPercent)
                        }
                        onTouchEnd={() =>
                          commitProgressUpdate(task.id, task.progressPercent)
                        }
                        disabled={
                          task.status === "completed" ||
                          inFlightUpdates[task.id]
                        }
                        className="w-full h-1.5 accent-[#A68B5B] bg-[#1A1A1A] rounded-full cursor-pointer disabled:opacity-50"
                      />
                    </div>
                    <span className="text-xs text-white font-mono w-10 text-right">
                      {task.progressPercent}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
