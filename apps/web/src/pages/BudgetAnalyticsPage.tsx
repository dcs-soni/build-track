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

const COLORS = [
  "#A68B5B",
  "#4A9079",
  "#6B8EC4",
  "#9E534F",
  "#8B7EC8",
  "#C4786B",
  "#4A5568",
];

type CategoryDatum = {
  name: string;
  estimated: number;
  actual: number;
  variance: number;
};

type TrendDatum = {
  date: string;
  amount: number;
};

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
  })) as CategoryDatum[];

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
            <CategoryDonutChart data={categoryData} />
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
            <CategoryComparisonChart data={categoryData} />
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
          <TrendBarChart data={spendingTrend as TrendDatum[]} />
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

function CategoryDonutChart({ data }: { data: CategoryDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.estimated, 0);
  let offset = 0;
  const gradientStops = data
    .map((item, index) => {
      const percentage = total > 0 ? (item.estimated / total) * 100 : 0;
      const start = offset;
      const end = offset + percentage;
      offset = end;
      return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="grid md:grid-cols-[180px_1fr] gap-6 items-center min-h-[300px]">
      <div className="flex items-center justify-center">
        <div
          className="relative h-40 w-40 rounded-full border border-[#1A1A1A]"
          style={{
            backgroundImage: `conic-gradient(${gradientStops || "#2A2A2A 0 100%"})`,
          }}
        >
          <div className="absolute inset-6 bg-[#0A0A0A] rounded-full border border-[#1A1A1A] flex flex-col items-center justify-center">
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
          const share = total > 0 ? Math.round((item.estimated / total) * 100) : 0;
          return (
            <div
              key={item.name}
              className="border border-[#1A1A1A] bg-[#111111] p-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-white">{item.name}</span>
                </div>
                <span className="text-xs tracking-[0.15em] text-[#A68B5B] uppercase">
                  {share}%
                </span>
              </div>
              <div className="mt-2 text-xs text-[#718096]">
                Planned {formatCurrency(item.estimated)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryComparisonChart({ data }: { data: CategoryDatum[] }) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.estimated, item.actual]),
    1,
  );

  return (
    <div className="space-y-4 min-h-[300px]">
      {data.map((item) => (
        <div key={item.name} className="border border-[#1A1A1A] bg-[#111111] p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-white">{item.name}</span>
            <span className="text-[#718096]">{formatCurrency(item.actual)}</span>
          </div>
          <div className="mt-3 space-y-2">
            <MetricBar
              label="Estimated"
              value={item.estimated}
              maxValue={maxValue}
              color="#2A2A2A"
            />
            <MetricBar
              label="Actual"
              value={item.actual}
              maxValue={maxValue}
              color="#A68B5B"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendBarChart({ data }: { data: TrendDatum[] }) {
  const maxAmount = Math.max(...data.map((item) => item.amount), 1);

  return (
    <div className="h-[200px] flex items-end gap-2 border border-[#1A1A1A] bg-[#111111] p-4 overflow-hidden">
      {data.map((item) => (
        <div key={item.date} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
          <div
            className="w-full bg-[#4A9079] min-h-[6px]"
            style={{ height: `${Math.max((item.amount / maxAmount) * 140, 6)}px` }}
            title={`${item.date}: ${formatCurrency(item.amount)}`}
          />
          <span className="text-[10px] text-[#4A5568]">
            {item.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MetricBar({
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
