import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { projectsApi } from "@/lib/api";

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
      const eased = 1 - Math.pow(1 - progress, 3);
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

// Metric Card Component - Floating/Sunken Style
function MetricCard({
  label,
  value,
  change,
  changeType,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}) {
  const numericValue = typeof value === "number" ? value : 0;
  const animatedCount = useAnimatedCounter(numericValue);
  const animatedValue = typeof value === "number" ? animatedCount : value;

  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 group hover:border-[#2A2A2A] transition-all duration-500">
      <div className="flex items-start justify-between mb-6">
        <div className="w-10 h-10 border border-[#2A2A2A] flex items-center justify-center text-[#4A5568] group-hover:text-[#A68B5B] group-hover:border-[#A68B5B]/30 transition-all duration-500">
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        {change && (
          <div
            className={`flex items-center gap-1 text-xs tracking-wide ${
              changeType === "positive"
                ? "text-[#4A9079]"
                : changeType === "negative"
                  ? "text-[#9E534F]"
                  : "text-[#4A5568]"
            }`}
          >
            {changeType === "positive" ? (
              <TrendingUp className="w-3 h-3" />
            ) : changeType === "negative" ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            {change}
          </div>
        )}
      </div>
      <div className="text-3xl font-medium text-white tracking-tight mb-1">
        {animatedValue}
      </div>
      <div className="text-xs tracking-[0.15em] text-[#4A5568] uppercase">
        {label}
      </div>
    </div>
  );
}

// Project Row Component
interface ProjectRowItem {
  id: string;
  name: string;
  client?: string;
  budget?: number;
  status: string;
}
function ProjectRow({ project }: { project: ProjectRowItem }) {
  const statusColors: Record<string, string> = {
    active: "bg-[#4A9079]",
    planning: "bg-[#A68B5B]",
    completed: "bg-[#4A5568]",
    on_hold: "bg-[#9E534F]",
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center justify-between py-4 border-b border-[#1A1A1A] last:border-0 group hover:bg-white/[0.01] transition-colors duration-300 -mx-6 px-6"
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-1.5 h-1.5 rounded-full ${statusColors[project.status] || statusColors.active}`}
        />
        <div>
          <p className="text-white font-medium text-sm group-hover:text-[#A68B5B] transition-colors duration-300">
            {project.name}
          </p>
          <p className="text-xs text-[#4A5568] mt-0.5">
            {project.client || "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-sm text-white">
            {formatCurrency(project.budget || 0)}
          </p>
          <p className="text-xs text-[#4A5568]">Budget</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#3A3A3A] group-hover:text-[#A68B5B] transition-colors duration-300" />
      </div>
    </Link>
  );
}

// Activity Item Component
interface ActivityItem {
  id: number;
  description: string;
  time: string;
}
function ActivityItem({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-[#1A1A1A] last:border-0">
      <div className="w-8 h-8 border border-[#2A2A2A] flex items-center justify-center text-[#4A5568] mt-0.5">
        <Clock className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#E1E1E1]">{activity.description}</p>
        <p className="text-xs text-[#4A5568] mt-1">{activity.time}</p>
      </div>
    </div>
  );
}

// Mini Chart Component (Monochromatic)
function MiniChart() {
  const bars = [35, 55, 45, 70, 60, 80, 65, 75, 50, 85, 70, 90];

  return (
    <div className="flex items-end justify-between gap-1 h-24">
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-[#2A2A2A] hover:bg-[#A68B5B]/40 transition-colors duration-300 cursor-pointer"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const projects = projectsData?.data?.data?.items || [];

  const stats = {
    total: projects.length,
    active: projects.filter((p: ProjectRowItem) => p.status === "active")
      .length,
    completed: projects.filter((p: ProjectRowItem) => p.status === "completed")
      .length,
    budget: projects.reduce(
      (sum: number, p: ProjectRowItem) => sum + Number(p.budget || 0),
      0,
    ),
  };

  // Mock activity data
  const recentActivity = [
    {
      id: 1,
      description: "Budget revised for Meridian Tower",
      time: "2 hours ago",
    },
    {
      id: 2,
      description: "New permit approved - Coastal Residence",
      time: "4 hours ago",
    },
    { id: 3, description: "Phase 2 milestone completed", time: "Yesterday" },
  ];

  // Mock alerts
  const alerts = [
    {
      id: 1,
      type: "warning",
      message: "Budget threshold reached - Urban Core",
      project: "Urban Core Complex",
    },
    {
      id: 2,
      type: "info",
      message: "Permit renewal due in 14 days",
      project: "Skybridge Pavilion",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
          Command Center
        </p>
        <h1 className="text-3xl font-medium text-white tracking-tight">
          Portfolio Overview
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={FolderKanban}
          label="Total Projects"
          value={stats.total || 12}
          change="+2 this month"
          changeType="positive"
        />
        <MetricCard
          icon={Clock}
          label="Active Projects"
          value={stats.active || 8}
          change="On track"
          changeType="neutral"
        />
        <MetricCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed || 4}
          change="+33%"
          changeType="positive"
        />
        <MetricCard
          icon={DollarSign}
          label="Budget Under Mgmt"
          value={formatCurrency(stats.budget || 2400000)}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Projects List - Large Card */}
        <div className="col-span-8 bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium text-white">
                Active Projects
              </h2>
              <p className="text-xs text-[#4A5568] mt-1">
                Real-time portfolio status
              </p>
            </div>
            <Link
              to="/projects"
              className="text-xs tracking-[0.1em] text-[#A68B5B] hover:text-white transition-colors uppercase"
            >
              View All
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[#4A5568]">Loading...</div>
          ) : projects.length > 0 ? (
            <div>
              {projects.slice(0, 5).map((project: ProjectRowItem) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-[#4A5568] mb-4">No projects yet</p>
              <Link
                to="/projects?create=true"
                className="text-[#A68B5B] text-sm hover:text-white transition-colors"
              >
                Create your first project →
              </Link>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="col-span-4 space-y-6">
          {/* Alerts Card */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle
                className="w-4 h-4 text-[#A68B5B]"
                strokeWidth={1.5}
              />
              <h3 className="text-sm font-medium text-white">Alerts</h3>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="py-3 border-b border-[#1A1A1A] last:border-0"
                >
                  <p className="text-sm text-[#E1E1E1]">{alert.message}</p>
                  <p className="text-xs text-[#4A5568] mt-1">{alert.project}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Card */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h3 className="text-sm font-medium text-white mb-4">
              Recent Activity
            </h3>
            <div>
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Card - Full Width */}
        <div className="col-span-12 bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[#4A5568]" strokeWidth={1.5} />
              <div>
                <h3 className="text-sm font-medium text-white">
                  Budget Performance
                </h3>
                <p className="text-xs text-[#4A5568]">
                  Monthly expenditure trend
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#4A5568]">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#2A2A2A]" />
                Actual
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#A68B5B]/40" />
                Projected
              </span>
            </div>
          </div>
          <MiniChart />
          <div className="flex justify-between mt-4 text-xs text-[#4A5568]">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
