import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  FileText,
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  AlertTriangle,
  Camera,
  MessageSquare,
  HardHat,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileDiff,
} from "lucide-react";
import { progressReportApi } from "@/lib/api";
import { PageHeader } from "@/components/ui";

type Period = "weekly" | "monthly";

function getWeekStart(offset: number) {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + offset * 7);
  return d.toISOString().split("T")[0];
}

function getMonthStr(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProgressReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [period, setPeriod] = useState<Period>("weekly");
  const [offset, setOffset] = useState(0);

  const weekStart = getWeekStart(offset);
  const monthStr = getMonthStr(offset);

  const { data, isLoading } = useQuery({
    queryKey: ["progress-report", projectId, period, offset],
    queryFn: () =>
      period === "weekly"
        ? progressReportApi.weekly(projectId!, { weekStart })
        : progressReportApi.monthly(projectId!, { month: monthStr }),
    enabled: !!projectId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report = data?.data?.data as any;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border border-[#A68B5B] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="print:bg-white print:text-black">
      <div className="mb-6 print:hidden">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-[#718096] hover:text-[#A68B5B] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
      </div>

      <PageHeader
        label="Reporting"
        title="Progress Reports"
        description="Auto-generated project progress reports from daily logs, expenses, and task data."
        actions={
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500 print:hidden"
          >
            <Printer className="h-4 w-4" />
            Export PDF
          </button>
        }
      />

      {/* Period Selector */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setPeriod("weekly");
              setOffset(0);
            }}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all ${
              period === "weekly"
                ? "bg-[#A68B5B] text-[#0A0A0A]"
                : "text-[#718096] hover:text-white border border-[#1A1A1A]"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => {
              setPeriod("monthly");
              setOffset(0);
            }}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all ${
              period === "monthly"
                ? "bg-[#A68B5B] text-[#0A0A0A]"
                : "text-[#718096] hover:text-white border border-[#1A1A1A]"
            }`}
          >
            Monthly
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setOffset(offset - 1)}
            className="p-2 text-[#718096] hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-white min-w-[200px] text-center">
            {report
              ? `${formatDate(report.dateRange.start)} — ${formatDate(report.dateRange.end)}`
              : "Loading..."}
          </span>
          <button
            onClick={() => setOffset(offset + 1)}
            disabled={offset >= 0}
            className="p-2 text-[#718096] hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-5 gap-4">
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Task Progress"
              value={`${report.tasks.avgProgress}%`}
              detail={`${report.tasks.completed}/${report.tasks.total} completed`}
              color="#4A9079"
            />
            <MetricCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Period Expenses"
              value={formatCurrency(report.expenses.total)}
              detail={`${report.expenses.count} transactions`}
              color="#A68B5B"
            />
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Avg Workers/Day"
              value={String(report.workers.avgWorkers)}
              detail={`Peak: ${report.workers.maxWorkers}`}
              color="#718096"
            />
            <MetricCard
              icon={<Camera className="h-4 w-4" />}
              label="Photos Taken"
              value={String(report.photos.count)}
              detail={`${report.workers.reportsCount} reports filed`}
              color="#6B8DD6"
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Safety Incidents"
              value={String(report.safety.incidentCount)}
              detail={
                report.safety.incidentCount === 0
                  ? "No incidents"
                  : "Review recommended"
              }
              color={report.safety.incidentCount > 0 ? "#9E534F" : "#4A9079"}
            />
          </div>

          {/* Budget Health */}
          <Section
            title="Budget Health"
            icon={<DollarSign className="h-4 w-4" />}
          >
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  Total Budget
                </p>
                <p className="text-lg text-white font-medium">
                  {formatCurrency(report.budgetHealth.totalBudget)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  Actual Spent
                </p>
                <p className="text-lg text-white font-medium">
                  {formatCurrency(report.budgetHealth.totalActual)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  % Spent
                </p>
                <p
                  className={`text-lg font-medium ${report.budgetHealth.percentSpent > 90 ? "text-[#9E534F]" : report.budgetHealth.percentSpent > 70 ? "text-[#A68B5B]" : "text-[#4A9079]"}`}
                >
                  {report.budgetHealth.percentSpent}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  Over-Budget Items
                </p>
                <p
                  className={`text-lg font-medium ${report.budgetHealth.overBudgetItems > 0 ? "text-[#9E534F]" : "text-[#4A9079]"}`}
                >
                  {report.budgetHealth.overBudgetItems}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  report.budgetHealth.percentSpent > 90
                    ? "bg-[#9E534F]"
                    : report.budgetHealth.percentSpent > 70
                      ? "bg-[#A68B5B]"
                      : "bg-[#4A9079]"
                }`}
                style={{
                  width: `${Math.min(report.budgetHealth.percentSpent, 100)}%`,
                }}
              />
            </div>
          </Section>

          {/* Task Summary */}
          <Section
            title="Task Summary"
            icon={<CheckCircle className="h-4 w-4" />}
          >
            <div className="grid grid-cols-5 gap-4">
              {[
                {
                  label: "Total",
                  value: report.tasks.total,
                  color: "text-white",
                },
                {
                  label: "Completed",
                  value: report.tasks.completed,
                  color: "text-[#4A9079]",
                },
                {
                  label: "In Progress",
                  value: report.tasks.inProgress,
                  color: "text-[#A68B5B]",
                },
                {
                  label: "Pending",
                  value: report.tasks.pending,
                  color: "text-[#718096]",
                },
                {
                  label: "Blocked",
                  value: report.tasks.blocked,
                  color: "text-[#9E534F]",
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className={`text-2xl font-medium ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* Expense Breakdown */}
          {report.expenses.count > 0 && (
            <Section
              title="Expense Breakdown"
              icon={<DollarSign className="h-4 w-4" />}
            >
              <div className="space-y-2">
                {Object.entries(
                  report.expenses.byCategory as Record<string, number>,
                )
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-[#718096] capitalize">
                        {category}
                      </span>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#A68B5B] rounded-full"
                            style={{
                              width: `${((amount as number) / report.expenses.total) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-white font-mono w-24 text-right">
                          {formatCurrency(amount as number)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </Section>
          )}

          {/* Change Orders */}
          <Section
            title="Change Orders"
            icon={<FileDiff className="h-4 w-4" />}
          >
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  Total
                </p>
                <p className="text-lg text-white font-medium">
                  {report.changeOrders.total}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  Pending
                </p>
                <p className="text-lg text-[#A68B5B] font-medium">
                  {report.changeOrders.pending}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  Approved
                </p>
                <p className="text-lg text-[#4A9079] font-medium">
                  {report.changeOrders.approved}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#4A5568] uppercase tracking-wider">
                  Total Value
                </p>
                <p className="text-lg text-white font-medium">
                  {formatCurrency(report.changeOrders.totalValue)}
                </p>
              </div>
            </div>
          </Section>

          {/* Open Items */}
          <div className="grid grid-cols-2 gap-4">
            <Section
              title="Open RFIs"
              icon={<MessageSquare className="h-4 w-4" />}
            >
              <p className="text-3xl text-white font-medium">
                {report.rfis.openCount}
              </p>
              <p className="text-xs text-[#718096] mt-1">Awaiting response</p>
            </Section>
            <Section title="Safety" icon={<HardHat className="h-4 w-4" />}>
              <p
                className={`text-3xl font-medium ${report.safety.incidentCount > 0 ? "text-[#9E534F]" : "text-[#4A9079]"}`}
              >
                {report.safety.incidentCount}
              </p>
              <p className="text-xs text-[#718096] mt-1">
                {report.safety.incidentCount === 0
                  ? "No incidents this period"
                  : `${report.safety.incidentCount} incident(s) reported`}
              </p>
            </Section>
          </div>

          {/* Daily Report Summaries */}
          {report.dailyReports.length > 0 && (
            <Section
              title="Daily Report Summaries"
              icon={<FileText className="h-4 w-4" />}
            >
              <div className="space-y-3">
                {report.dailyReports.map(
                  (dr: {
                    id: string;
                    reportDate: string;
                    weather: string | null;
                    workSummary: string | null;
                    issues: string | null;
                    workersCount: number | null;
                    author: string | null;
                  }) => (
                    <div
                      key={dr.id}
                      className="border-l-2 border-[#1A1A1A] pl-4 py-1"
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs text-[#A68B5B] font-mono">
                          {new Date(dr.reportDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {dr.weather && (
                          <span className="text-[10px] text-[#4A5568] uppercase">
                            {dr.weather}
                          </span>
                        )}
                        {dr.workersCount && (
                          <span className="text-[10px] text-[#4A5568]">
                            <Users className="h-3 w-3 inline mr-1" />
                            {dr.workersCount}
                          </span>
                        )}
                      </div>
                      {dr.workSummary && (
                        <p className="text-sm text-[#718096] line-clamp-2">
                          {dr.workSummary}
                        </p>
                      )}
                      {dr.issues && (
                        <p className="text-xs text-[#9E534F] mt-1">
                          Issues: {dr.issues}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </Section>
          )}

          {/* Footer */}
          <div className="text-center py-4 border-t border-[#1A1A1A]">
            <p className="text-[10px] text-[#4A5568] uppercase tracking-widest">
              Generated by BuildTrack •{" "}
              {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {!report && !isLoading && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Calendar className="h-8 w-8 text-[#4A5568] mb-4" />
          <p className="text-white mb-1">No report data available</p>
          <p className="text-sm text-[#718096]">
            Try selecting a different time period.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Reusable Components ─────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl text-white font-medium">{value}</p>
      <p className="text-[10px] text-[#4A5568] mt-1">{detail}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#A68B5B]">{icon}</span>
        <h3 className="text-sm font-medium text-white uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
