import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@buildtrack/shared";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

export function BudgetAnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["budget-analytics", projectId],
    queryFn: () => api.get(`/budget/projects/${projectId}/analytics`),
    enabled: !!projectId,
  });

  const analytics = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        No budget data available
      </div>
    );
  }

  const { summary, byCategory, overBudgetItems, spendingTrend } = analytics;
  const categoryData = Object.entries(byCategory).map(
    ([name, data]: [string, any]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      estimated: data.estimated,
      actual: data.actual,
      variance: data.variance,
    }),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Budget"
          value={formatCurrency(summary.totalBudget)}
          color="blue"
        />
        <SummaryCard
          icon={DollarSign}
          label="Spent"
          value={formatCurrency(summary.totalActual)}
          subtext={`${summary.percentSpent}%`}
          color="purple"
        />
        <SummaryCard
          icon={summary.totalVariance >= 0 ? TrendingUp : TrendingDown}
          label="Variance"
          value={formatCurrency(Math.abs(summary.totalVariance))}
          subtext={summary.totalVariance >= 0 ? "Under budget" : "Over budget"}
          color={summary.totalVariance >= 0 ? "green" : "red"}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Over Budget Items"
          value={overBudgetItems.length}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Budget by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="estimated"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Estimated vs Actual Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Estimated vs Actual
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="estimated" fill="#93C5FD" name="Estimated" />
              <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending Trend */}
      {spendingTrend.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Spending (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spendingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Over Budget Items Alert */}
      {overBudgetItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Over Budget Items
          </h3>
          <div className="space-y-2">
            {overBudgetItems.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {item.description}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({item.category})
                  </span>
                </div>
                <span className="text-red-600 font-medium">
                  +{formatCurrency(item.overBy)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg ${colors[color]} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}
