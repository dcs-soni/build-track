import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  FolderKanban,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@buildtrack/shared";

const CATEGORY_COLORS: Record<string, string> = {
  labor: "#A68B5B",
  materials: "#6B8EC4",
  equipment: "#4A9079",
  permits: "#8B7EC8",
  overhead: "#C4786B",
  subcontractor: "#5A8F7A",
  contingency: "#9E534F",
  travel: "#7C9EBC",
  other: "#4A5568",
};

const PIE_COLORS = [
  "#A68B5B",
  "#4A9079",
  "#6B8EC4",
  "#9E534F",
  "#8B7EC8",
  "#C4786B",
  "#4A5568",
];

interface ProjectBreakdown {
  id: string;
  name: string;
  status: string;
  budget: number;
  estimated: number;
  actual: number;
  variance: number;
  utilization: number;
  taskCount: number;
}

interface ExpenseCategory {
  category: string;
  total: number;
  count: number;
}

interface BudgetCategory {
  category: string;
  estimated: number;
  actual: number;
  variance: number;
}

interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  vendor: string | null;
  projectName: string;
}

interface ExpensePieDatum {
  name: string;
  value: number;
}

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => api.get("/analytics/summary"),
  });

  const analytics = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A68B5B] border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto text-center py-16">
        <BarChart3
          className="h-12 w-12 text-[#2A2A2A] mx-auto mb-4"
          strokeWidth={1}
        />
        <h3 className="font-medium text-white mb-2">No analytics data</h3>
        <p className="text-[#4A5568] text-sm mb-6">
          Create projects and add budget items to see analytics.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors duration-300"
        >
          <FolderKanban className="h-4 w-4" strokeWidth={1.5} />
          Go to Projects
        </Link>
      </div>
    );
  }

  const {
    overview,
    projectBreakdown,
    expenseByCategory,
    budgetByCategory,
    recentExpenses,
  } = analytics;

  // Format budget category data for charts
  const budgetChartData = (budgetByCategory as BudgetCategory[]).map((c) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    estimated: c.estimated,
    actual: c.actual,
  }));

  // Pie chart data from expense categories
  const expensePieData = (expenseByCategory as ExpenseCategory[])
    .filter((c) => c.total > 0)
    .map((c) => ({
      name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
      value: c.total,
    })) as ExpensePieDatum[];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
          Financial Intelligence
        </p>
        <h1 className="text-3xl font-medium text-white tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-[#4A5568] mt-1">
          Cross-project financial overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Budget"
          value={formatCurrency(overview.totalBudget)}
          icon={DollarSign}
          accent="#A68B5B"
        />
        <KPICard
          label="Total Spent"
          value={formatCurrency(overview.totalActual)}
          icon={overview.totalVariance >= 0 ? TrendingUp : TrendingDown}
          subtext={`${overview.overallUtilization}% utilized`}
          accent={overview.totalVariance >= 0 ? "#4A9079" : "#9E534F"}
        />
        <KPICard
          label="Active Projects"
          value={overview.activeProjects}
          icon={FolderKanban}
          subtext={`of ${overview.totalProjects} total`}
          accent="#6B8EC4"
        />
        <KPICard
          label="Over Budget"
          value={overview.overBudgetCount}
          icon={AlertTriangle}
          accent={overview.overBudgetCount > 0 ? "#9E534F" : "#4A9079"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget by Category Bar Chart */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <h3 className="text-sm font-medium text-white mb-6">
            Budget vs Actual by Category
          </h3>
          {budgetChartData.length > 0 ? (
            <BudgetCategoryBars data={budgetChartData} />
          ) : (
            <EmptyChartState message="No budget categories to display" />
          )}
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <h3 className="text-sm font-medium text-white mb-6">
            Expense Distribution
          </h3>
          {expensePieData.length > 0 ? (
            <ExpenseDonutChart data={expensePieData} />
          ) : (
            <EmptyChartState message="No expense data to display" />
          )}
        </div>
      </div>

      {/* Project Breakdown Table */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A]">
        <div className="p-6 border-b border-[#1A1A1A] flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Project Breakdown</h3>
          <Link
            to="/projects"
            className="text-xs text-[#4A5568] hover:text-[#A68B5B] transition-colors flex items-center gap-1 tracking-wide uppercase"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {(projectBreakdown as ProjectBreakdown[]).length === 0 ? (
          <div className="p-12 text-center text-[#4A5568] text-sm">
            No projects to display
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  <th className="text-left p-4 text-xs tracking-[0.15em] text-[#4A5568] uppercase font-medium">
                    Project
                  </th>
                  <th className="text-right p-4 text-xs tracking-[0.15em] text-[#4A5568] uppercase font-medium">
                    Budget
                  </th>
                  <th className="text-right p-4 text-xs tracking-[0.15em] text-[#4A5568] uppercase font-medium">
                    Spent
                  </th>
                  <th className="text-right p-4 text-xs tracking-[0.15em] text-[#4A5568] uppercase font-medium">
                    Utilization
                  </th>
                  <th className="text-right p-4 text-xs tracking-[0.15em] text-[#4A5568] uppercase font-medium">
                    Status
                  </th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {(projectBreakdown as ProjectBreakdown[]).map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="p-4">
                      <span className="text-white font-medium">
                        {project.name}
                      </span>
                    </td>
                    <td className="p-4 text-right text-[#E1E1E1]">
                      {formatCurrency(project.budget)}
                    </td>
                    <td className="p-4 text-right text-[#E1E1E1]">
                      {formatCurrency(project.actual)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-16 h-1 bg-[#1A1A1A] overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              project.utilization > 100
                                ? "bg-[#9E534F]"
                                : project.utilization > 80
                                  ? "bg-[#D4796E]"
                                  : "bg-[#4A9079]"
                            }`}
                            style={{
                              width: `${Math.min(project.utilization, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs tabular-nums ${
                            project.utilization > 100
                              ? "text-[#9E534F]"
                              : "text-[#4A5568]"
                          }`}
                        >
                          {project.utilization}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/projects/${project.id}/budget`}
                        className="text-[#4A5568] hover:text-[#A68B5B] transition-colors"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A]">
        <div className="p-6 border-b border-[#1A1A1A]">
          <h3 className="text-sm font-medium text-white">Recent Expenses</h3>
        </div>
        {(recentExpenses as RecentExpense[]).length === 0 ? (
          <div className="p-12 text-center text-[#4A5568] text-sm">
            No expenses recorded yet
          </div>
        ) : (
          <div className="divide-y divide-[#1A1A1A]">
            {(recentExpenses as RecentExpense[]).map((expense) => (
              <div
                key={expense.id}
                className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[expense.category] || "#4A5568",
                    }}
                  />
                  <div>
                    <p className="text-sm text-white">{expense.description}</p>
                    <p className="text-xs text-[#4A5568] mt-0.5">
                      {expense.projectName}
                      {expense.vendor && ` · ${expense.vendor}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white tabular-nums">
                    {formatCurrency(expense.amount)}
                  </p>
                  <p className="text-xs text-[#4A5568]">{expense.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BudgetCategoryBars({
  data,
}: {
  data: Array<{ name: string; estimated: number; actual: number }>;
}) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.estimated, item.actual]),
    1,
  );

  return (
    <div className="space-y-4 min-h-[280px]">
      {data.map((item) => (
        <div key={item.name} className="border border-[#1A1A1A] bg-[#111111] p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-sm text-white">{item.name}</span>
            <span className="text-xs text-[#718096]">
              {formatCurrency(item.actual)}
            </span>
          </div>
          <DualBar
            label="Estimated"
            value={item.estimated}
            maxValue={maxValue}
            color="#2A2A2A"
          />
          <div className="mt-2" />
          <DualBar
            label="Actual"
            value={item.actual}
            maxValue={maxValue}
            color="#A68B5B"
          />
        </div>
      ))}
    </div>
  );
}

function ExpenseDonutChart({ data }: { data: ExpensePieDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const gradient = data
    .map((item, index) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const start = offset;
      const end = offset + percentage;
      offset = end;
      return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="grid md:grid-cols-[180px_1fr] gap-6 items-center min-h-[280px]">
      <div className="flex items-center justify-center">
        <div
          className="relative h-40 w-40 rounded-full border border-[#1A1A1A]"
          style={{
            backgroundImage: `conic-gradient(${gradient || "#2A2A2A 0 100%"})`,
          }}
        >
          <div className="absolute inset-6 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#4A5568]">
              Total
            </span>
            <span className="mt-2 text-sm text-white font-medium text-center px-3">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div
              key={item.name}
              className="border border-[#1A1A1A] bg-[#111111] p-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="text-sm text-white">{item.name}</span>
                </div>
                <span className="text-xs tracking-[0.15em] text-[#A68B5B] uppercase">
                  {percentage}%
                </span>
              </div>
              <div className="mt-2 text-xs text-[#718096]">
                {formatCurrency(item.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DualBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.12em] text-[#4A5568] mb-1">
        <span>{label}</span>
        <span>{formatCurrency(value)}</span>
      </div>
      <div className="h-2 bg-[#0A0A0A] overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${Math.max((value / maxValue) * 100, value > 0 ? 4 : 0)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Subcomponents ─────────────────────────────────────────────── */

function KPICard({
  label,
  value,
  icon: Icon,
  subtext,
  accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  accent: string;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 group hover:border-[#2A2A2A] transition-all duration-500">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 border border-[#2A2A2A] flex items-center justify-center group-hover:border-opacity-60 transition-all duration-500"
          style={{ color: accent }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-2xl font-medium text-white tracking-tight mb-1">
        {value}
      </p>
      <p className="text-xs tracking-[0.15em] text-[#4A5568] uppercase">
        {label}
      </p>
      {subtext && <p className="text-xs text-[#4A5568] mt-1">{subtext}</p>}
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planning: "bg-[#4A5568]/20 text-[#718096]",
    active: "bg-[#A68B5B]/20 text-[#A68B5B]",
    on_hold: "bg-[#9E534F]/20 text-[#D4796E]",
    completed: "bg-[#4A9079]/20 text-[#4A9079]",
    cancelled: "bg-[#9E534F]/20 text-[#9E534F]",
  };

  return (
    <span
      className={`inline-block px-2.5 py-1 text-xs tracking-wide uppercase ${styles[status] || styles.planning}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-[280px] flex items-center justify-center text-[#4A5568] text-sm">
      {message}
    </div>
  );
}
