import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Search,
  Building2,
} from "lucide-react";
import { expenseApi } from "@/lib/api";
import type { Expense } from "@buildtrack/shared";
import { formatCurrency } from "@buildtrack/shared";
import { ExpenseCreateModal } from "@/components/expenses/ExpenseCreateModal";

const STATUS_COLORS: Record<string, string> = {
  approved: "text-[#4A9079] bg-[#4A9079]/10",
  pending: "text-[#A68B5B] bg-[#A68B5B]/10",
  rejected: "text-[#9E534F] bg-[#9E534F]/10",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  approved: <CheckCircle2 className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
};

export function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      return expenseApi.list(params).then((res) => res.data);
    },
  });

  const expenses = data?.data || [];

  const filteredExpenses = expenses.filter((expense: Expense) => {
    if (!search) return true;
    const lowerSearch = search.toLowerCase();
    return (
      (expense.description?.toLowerCase() || "").includes(lowerSearch) ||
      (expense.vendor?.toLowerCase() || "").includes(lowerSearch) ||
      (expense.project?.name?.toLowerCase() || "").includes(lowerSearch)
    );
  });

  const generateReport = () => {
    // Demo function for exporting to CSV/PDF
    alert("Expense report export started...");
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Financials
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Expense Tracking
          </h1>
          <p className="text-[#4A5568] mt-2 max-w-2xl">
            Log, categorize, and approve project expenses. Items approved here
            automatically sync with the project's Budget Analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-4 py-2 border border-[#1A1A1A] text-xs font-medium tracking-[0.1em] text-[#E1E1E1] uppercase hover:bg-white/[0.02] transition-colors"
          >
            <FileText className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors shadow-lg shadow-[#A68B5B]/20"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Log Expense
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <p className="text-xs tracking-[0.1em] text-[#4A5568] uppercase mb-4">
            Total Expenses (30d)
          </p>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-medium text-white tracking-tight">
              {formatCurrency(
                expenses.reduce(
                  (acc: number, exp: Expense) => acc + Number(exp.amount),
                  0,
                ),
              )}
            </h3>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <p className="text-xs tracking-[0.1em] text-[#A68B5B] uppercase mb-4">
            Pending Approval
          </p>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-medium text-white tracking-tight">
              {expenses.filter((e: Expense) => e.status === "pending").length}
            </h3>
            <span className="text-sm text-[#4A5568]">items</span>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
          <p className="text-xs tracking-[0.1em] text-[#4A9079] uppercase mb-4">
            Total Approved
          </p>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-medium text-white tracking-tight">
              {formatCurrency(
                expenses
                  .filter((e: Expense) => e.status === "approved")
                  .reduce(
                    (acc: number, exp: Expense) => acc + Number(exp.amount),
                    0,
                  ),
              )}
            </h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
          <input
            type="text"
            placeholder="Search vendor, description, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#4A5568]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm px-4 py-2 focus:outline-none focus:border-[#A68B5B] transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A]">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A68B5B] border-t-transparent" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
              <DollarSign className="h-8 w-8 text-[#4A5568]" strokeWidth={1} />
            </div>
            <h3 className="text-white font-medium mb-2">No expenses found</h3>
            <p className="text-sm text-[#4A5568]">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Record your first project expense to start tracking costs"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111111] border-b border-[#1A1A1A] text-[#4A5568]">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">
                    Date
                  </th>
                  <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">
                    Details
                  </th>
                  <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">
                    Project
                  </th>
                  <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs">
                    Amount
                  </th>
                  <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 font-medium tracking-wide uppercase text-xs text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {filteredExpenses.map((expense: Expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-[#E1E1E1]">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium truncate max-w-xs">
                        {expense.description}
                      </p>
                      <p className="text-xs text-[#4A5568] mt-1">
                        {expense.vendor || "No Vendor"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {expense.project?.name ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-[#4A5568]" />
                          <span className="text-[#E1E1E1] text-xs px-2 py-1 bg-[#1A1A1A] rounded">
                            {expense.project.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#4A5568] italic">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium tracking-tight">
                      {formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium uppercase tracking-wide rounded-full ${STATUS_COLORS[expense.status]}`}
                        >
                          {STATUS_ICONS[expense.status]}
                          {expense.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {expense.status === "pending" && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1.5 text-[#4A9079] hover:bg-[#4A9079]/10 transition-colors rounded"
                            title="Approve"
                            onClick={() => {
                              expenseApi.approve(expense.id).then(() => {
                                queryClient.invalidateQueries({
                                  queryKey: ["expenses"],
                                });
                              });
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1.5 text-[#9E534F] hover:bg-[#9E534F]/10 transition-colors rounded"
                            title="Reject"
                            onClick={() => {
                              expenseApi.reject(expense.id).then(() => {
                                queryClient.invalidateQueries({
                                  queryKey: ["expenses"],
                                });
                              });
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }}
      />
    </div>
  );
}
