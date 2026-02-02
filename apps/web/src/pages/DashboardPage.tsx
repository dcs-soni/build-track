import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FolderKanban,
  DollarSign,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Users,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { projectsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency } from "@buildtrack/shared";

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const projects = projectsData?.data?.data?.items || [];

  const stats = {
    total: projects.length,
    active: projects.filter((p: any) => p.status === "active").length,
    completed: projects.filter((p: any) => p.status === "completed").length,
    budget: projects.reduce(
      (sum: number, p: any) => sum + Number(p.budget || 0),
      0,
    ),
  };

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--charcoal)]">
          {getGreeting()}, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-[var(--stone)] mt-1">
          Here's what's happening across your projects today.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Stats Row - 4 cards */}
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={stats.total}
          trend="+12%"
          trendUp
          className="col-span-3"
        />
        <StatCard
          icon={Clock}
          label="Active"
          value={stats.active}
          trend="On track"
          trendUp
          accentColor="teal"
          className="col-span-3"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          trend="+3 this month"
          trendUp
          accentColor="sage"
          className="col-span-3"
        />
        <StatCard
          icon={DollarSign}
          label="Total Budget"
          value={formatCurrency(stats.budget)}
          trend="8% under"
          trendUp
          accentColor="bronze"
          className="col-span-3"
          isCurrency
        />

        {/* Main Project Overview - Large Card */}
        <div className="col-span-8 bento-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[var(--charcoal)]">
                Recent Projects
              </h2>
              <p className="text-sm text-[var(--stone)]">
                Your latest activity
              </p>
            </div>
            <Link
              to="/projects"
              className="flex items-center gap-2 text-[var(--teal)] hover:text-[var(--teal-light)] font-medium text-sm transition-colors"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[var(--sand)] flex items-center justify-center mx-auto mb-4">
                <FolderKanban className="h-8 w-8 text-[var(--stone)]" />
              </div>
              <h3 className="font-semibold text-[var(--charcoal)] mb-2">
                No projects yet
              </h3>
              <p className="text-[var(--stone)] mb-6">
                Get started by creating your first project.
              </p>
              <Link
                to="/projects"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project: any) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Side Card */}
        <div className="col-span-4 space-y-6">
          {/* Quick Actions */}
          <div className="bento-card">
            <h3 className="font-semibold text-[var(--charcoal)] mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <QuickAction
                icon={Plus}
                label="Create New Project"
                to="/projects"
              />
              <QuickAction
                icon={Users}
                label="Invite Team Member"
                to="/settings/team"
              />
              <QuickAction
                icon={Clock}
                label="View Activity Log"
                to="/activity"
              />
            </div>
          </div>

          {/* Alerts */}
          <div className="bento-card bg-[var(--terracotta)]/5 border border-[var(--terracotta)]/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--terracotta)]/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-[var(--terracotta)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--charcoal)] mb-1">
                  2 permits expiring
                </h3>
                <p className="text-sm text-[var(--stone)]">
                  Review permits before they expire to avoid project delays.
                </p>
                <button className="text-sm text-[var(--terracotta)] font-medium mt-2 hover:underline">
                  View permits →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Activity & Budget */}
        <div className="col-span-6 bento-card">
          <h3 className="font-semibold text-[var(--charcoal)] mb-4">
            Budget Overview
          </h3>
          <div className="space-y-4">
            <BudgetBar label="Labor" spent={45000} total={60000} />
            <BudgetBar label="Materials" spent={32000} total={50000} />
            <BudgetBar label="Equipment" spent={12000} total={15000} />
            <BudgetBar label="Permits" spent={8000} total={10000} />
          </div>
        </div>

        <div className="col-span-6 bento-card">
          <h3 className="font-semibold text-[var(--charcoal)] mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            <ActivityItem
              user="Sarah Chen"
              action="updated the budget for"
              target="Skyline Tower"
              time="2 min ago"
            />
            <ActivityItem
              user="Marcus Johnson"
              action="completed task in"
              target="Riverside Complex"
              time="15 min ago"
            />
            <ActivityItem
              user="Emily Rodriguez"
              action="uploaded 5 photos to"
              target="Harbor View"
              time="1 hour ago"
            />
            <ActivityItem
              user="David Kim"
              action="approved daily report for"
              target="Central Plaza"
              time="2 hours ago"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  accentColor = "mocha",
  className = "",
  isCurrency = false,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  accentColor?: string;
  className?: string;
  isCurrency?: boolean;
}) {
  const numericValue =
    typeof value === "number"
      ? value
      : parseInt(value.replace(/[^0-9]/g, "")) || 0;
  const animatedValue = useAnimatedCounter(isCurrency ? 0 : numericValue);

  const colors: Record<string, string> = {
    mocha: "from-[var(--mocha)] to-[var(--mocha-light)]",
    teal: "from-[var(--teal)] to-[var(--teal-light)]",
    sage: "from-[var(--sage)] to-[var(--sage-light)]",
    bronze: "from-[var(--bronze)] to-[#D4A84B]",
  };

  return (
    <div className={`bento-card group ${className}`}>
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[accentColor]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trendUp
                ? "bg-[var(--sage)]/10 text-[var(--sage)]"
                : "bg-[var(--terracotta)]/10 text-[var(--terracotta)]"
            }`}
          >
            {trendUp && <TrendingUp className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-[var(--charcoal)] tabular-nums">
          {isCurrency ? value : animatedValue.toLocaleString()}
        </p>
        <p className="text-sm text-[var(--stone)] mt-1">{label}</p>
      </div>
    </div>
  );
}

// Project Row Component
function ProjectRow({ project }: { project: any }) {
  const statusColors: Record<string, string> = {
    planning: "bg-[var(--stone)]/10 text-[var(--stone)]",
    active: "bg-[var(--teal)]/10 text-[var(--teal)]",
    on_hold: "bg-[var(--terracotta)]/10 text-[var(--terracotta)]",
    completed: "bg-[var(--sage)]/10 text-[var(--sage)]",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center justify-between p-4 rounded-xl bg-[var(--ivory)] hover:bg-[var(--sand)]/50 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--teal)] to-[var(--mocha)] flex items-center justify-center text-white font-bold text-lg">
          {project.name?.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-[var(--charcoal)] group-hover:text-[var(--teal)] transition-colors">
            {project.name}
          </h4>
          <p className="text-sm text-[var(--stone)]">
            {project.projectType || "Construction"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
            statusColors[project.status] || statusColors.planning
          }`}
        >
          {project.status?.replace("_", " ")}
        </span>
        <ArrowUpRight className="h-5 w-5 text-[var(--stone)] group-hover:text-[var(--teal)] transition-colors" />
      </div>
    </Link>
  );
}

// Quick Action Component
function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: any;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--sand)]/50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--sand)] flex items-center justify-center group-hover:bg-[var(--teal)] group-hover:text-white transition-colors">
        <Icon className="h-5 w-5 text-[var(--stone)] group-hover:text-white transition-colors" />
      </div>
      <span className="font-medium text-[var(--charcoal)]">{label}</span>
    </Link>
  );
}

// Budget Bar Component
function BudgetBar({
  label,
  spent,
  total,
}: {
  label: string;
  spent: number;
  total: number;
}) {
  const percentage = Math.min((spent / total) * 100, 100);
  const isOver = spent > total;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--charcoal)]">
          {label}
        </span>
        <span className="text-sm text-[var(--stone)]">
          {formatCurrency(spent)} / {formatCurrency(total)}
        </span>
      </div>
      <div className="h-2 bg-[var(--sand)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver
              ? "bg-[var(--terracotta)]"
              : "bg-gradient-to-r from-[var(--teal)] to-[var(--teal-light)]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({
  user,
  action,
  target,
  time,
}: {
  user: string;
  action: string;
  target: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--teal)] to-[var(--mocha)] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
        {user.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--charcoal)]">
          <span className="font-medium">{user}</span>{" "}
          <span className="text-[var(--stone)]">{action}</span>{" "}
          <span className="font-medium">{target}</span>
        </p>
        <p className="text-xs text-[var(--stone)] mt-0.5">{time}</p>
      </div>
    </div>
  );
}
