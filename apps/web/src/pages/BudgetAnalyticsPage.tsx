import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@buildtrack/shared";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  "#A68B5B",
  "#4A9079",
  "#6B8EC4",
  "#9E534F",
  "#8B7EC8",
  "#C4786B",
  "#4A5568",
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A68B5B] border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <DollarSign
          className="h-12 w-12 text-[#2A2A2A] mx-auto mb-4"
          strokeWidth={1}
        />
        <p className="text-[#4A5568]">No budget data available</p>
        <p className="text-xs text-[#3A3A3A] mt-2">
          Add budget items to a project to see analytics
        </p>
      </div>
    );
  }

  const { summary, byCategory, overBudgetItems, spendingTrend } = analytics;
  const categoryData = Object.entries(
    byCategory as Record<
      string,
      { estimated: number; actual: number; variance: number }
    >,
  ).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    estimated: data.estimated,
    actual: data.actual,
    variance: data.variance,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Financial Intelligence
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Budget Analytics
          </h1>
        </div>
        <Link
          to="/expenses"
          className="flex items-center gap-2 px-4 py-2 bg-[#A68B5B]/10 text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B]/20 transition-colors border border-[#A68B5B]/20"
        >
          <DollarSign className="h-4 w-4" />
          View Expense Log
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Budget"
          value={formatCurrency(summary.totalBudget)}
          accent="#A68B5B"
        />
        <SummaryCard
          icon={DollarSign}
          label="Spent"
          value={formatCurrency(summary.totalActual)}
          subtext={`${summary.percentSpent}%`}
          accent="#8B7EC8"
        />
        <SummaryCard
          icon={summary.totalVariance >= 0 ? TrendingUp : TrendingDown}
          label="Variance"
          value={formatCurrency(Math.abs(summary.totalVariance))}
          subtext={summary.totalVariance >= 0 ? "Under budget" : "Over budget"}
          accent={summary.totalVariance >= 0 ? "#4A9079" : "#9E534F"}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Over Budget Items"
          value={overBudgetItems.length}
          accent="#D4796E"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Pie */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <h3 className="text-sm font-medium text-white mb-6">
            Budget by Category
          </h3>
          {categoryData.length > 0 ? (
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
                  stroke="#1A1A1A"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#111111",
                    border: "1px solid #1A1A1A",
                    color: "#E1E1E1",
                    borderRadius: 0,
                  }}
                  labelStyle={{ color: "#A68B5B" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#4A5568] text-sm">
              No category data
            </div>
          )}
        </div>

        {/* Estimated vs Actual Bar */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <h3 className="text-sm font-medium text-white mb-6">
            Estimated vs Actual
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#4A5568" }}
                  axisLine={{ stroke: "#1A1A1A" }}
                  tickLine={{ stroke: "#1A1A1A" }}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12, fill: "#4A5568" }}
                  axisLine={{ stroke: "#1A1A1A" }}
                  tickLine={{ stroke: "#1A1A1A" }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#111111",
                    border: "1px solid #1A1A1A",
                    color: "#E1E1E1",
                    borderRadius: 0,
                  }}
                  labelStyle={{ color: "#A68B5B" }}
                />
                <Bar dataKey="estimated" fill="#2A2A2A" name="Estimated" />
                <Bar dataKey="actual" fill="#A68B5B" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#4A5568] text-sm">
              No comparison data
            </div>
          )}
        </div>
      </div>

      {/* Spending Trend */}
      {spendingTrend.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <h3 className="text-sm font-medium text-white mb-6">
            Daily Spending (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spendingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#4A5568" }}
                axisLine={{ stroke: "#1A1A1A" }}
                tickLine={{ stroke: "#1A1A1A" }}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fontSize: 12, fill: "#4A5568" }}
                axisLine={{ stroke: "#1A1A1A" }}
                tickLine={{ stroke: "#1A1A1A" }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "#111111",
                  border: "1px solid #1A1A1A",
                  color: "#E1E1E1",
                  borderRadius: 0,
                }}
                labelStyle={{ color: "#A68B5B" }}
              />
              <Bar dataKey="amount" fill="#4A9079" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Over Budget Items Alert */}
      {overBudgetItems.length > 0 && (
        <div className="bg-[#9E534F]/10 border border-[#9E534F]/30 p-6">
          <h3 className="text-sm font-medium text-[#D4796E] mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            Over Budget Items
          </h3>
          <div className="space-y-2">
            {overBudgetItems.map(
              (item: {
                id: string;
                description: string;
                category: string;
                overBy: number;
              }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-[#0A0A0A] border border-[#1A1A1A] p-3"
                >
                  <div>
                    <span className="font-medium text-white">
                      {item.description}
                    </span>
                    <span className="text-xs text-[#4A5568] ml-2 tracking-wide uppercase">
                      ({item.category})
                    </span>
                  </div>
                  <span className="text-[#D4796E] font-medium">
                    +{formatCurrency(item.overBy)}
                  </span>
                </div>
              ),
            )}
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
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  accent: string;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 border border-[#2A2A2A] flex items-center justify-center"
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
