import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  FileDiff,
  Plus,
  X,
  Calendar,
  DollarSign,
  Clock,
  ArrowLeft,
  User,
  CheckCircle,
  XCircle,
  Send,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { changeOrderApi } from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { CHANGE_ORDER_STATUS_VARIANT } from "@/lib/constants";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const ITEM_CATEGORIES = [
  { value: "labor", label: "Labor" },
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "other", label: "Other" },
];

interface CreateForm {
  title: string;
  description: string;
  reason: string;
  priority: string;
  drawingRef: string;
  specSection: string;
}

interface ItemForm {
  category: string;
  description: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

const defaultForm: CreateForm = {
  title: "",
  description: "",
  reason: "",
  priority: "medium",
  drawingRef: "",
  specSection: "",
};

const defaultItemForm: ItemForm = {
  category: "labor",
  description: "",
  quantity: "1",
  unitCost: "",
  notes: "",
};

export function ChangeOrdersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState<CreateForm>(defaultForm);
  const [itemForm, setItemForm] = useState<ItemForm>(defaultItemForm);

  const { data, isLoading } = useQuery({
    queryKey: ["change-orders", projectId, statusFilter],
    queryFn: () =>
      changeOrderApi.listByProject(projectId!, {
        ...(statusFilter && { status: statusFilter }),
      }),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => changeOrderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["change-orders", projectId],
      });
      setShowCreate(false);
      setForm(defaultForm);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => changeOrderApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["change-orders", projectId],
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => changeOrderApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["change-orders", projectId],
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      changeOrderApi.reject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["change-orders", projectId],
      });
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({
      coId,
      data,
    }: {
      coId: string;
      data: Record<string, unknown>;
    }) => changeOrderApi.addItem(coId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["change-orders", projectId],
      });
      setShowAddItem(null);
      setItemForm(defaultItemForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => changeOrderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["change-orders", projectId],
      });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseData = data?.data?.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changeOrders = (responseData?.items as any[]) ?? [];
  const summary = responseData?.summary ?? {
    totalCount: 0,
    totalEstimated: 0,
    totalApproved: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  };

  const handleCreate = () => {
    createMutation.mutate({
      projectId,
      title: form.title,
      description: form.description || undefined,
      reason: form.reason || undefined,
      priority: form.priority,
      drawingRef: form.drawingRef || undefined,
      specSection: form.specSection || undefined,
    });
  };

  const handleAddItem = (coId: string) => {
    addItemMutation.mutate({
      coId,
      data: {
        category: itemForm.category,
        description: itemForm.description,
        quantity: Number(itemForm.quantity) || 1,
        unitCost: Number(itemForm.unitCost) || 0,
        notes: itemForm.notes || undefined,
      },
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border border-[#A68B5B] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-[#718096] hover:text-[#A68B5B] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
      </div>

      <PageHeader
        label="Financial Management"
        title="Change Orders"
        description="Track scope changes, manage budget impact, and streamline the approval workflow for project modifications."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500"
          >
            <Plus className="h-4 w-4" />
            New Change Order
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1">
            Total Estimated
          </p>
          <p className="text-xl text-white font-medium">
            {formatCurrency(summary.totalEstimated)}
          </p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1">
            Approved Cost
          </p>
          <p className="text-xl text-[#4A9079] font-medium">
            {formatCurrency(summary.totalApproved)}
          </p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1">
            Pending
          </p>
          <p className="text-xl text-[#A68B5B] font-medium">
            {summary.pendingCount}
          </p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-1">
            Approved / Rejected
          </p>
          <p className="text-xl text-white font-medium">
            <span className="text-[#4A9079]">{summary.approvedCount}</span>
            {" / "}
            <span className="text-[#9E534F]">{summary.rejectedCount}</span>
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1A1A1A]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2.5 text-xs font-medium tracking-wide transition-all duration-300 border-b-2 ${
              statusFilter === tab.value
                ? "text-[#A68B5B] border-[#A68B5B]"
                : "text-[#718096] border-transparent hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Change Orders List */}
      {changeOrders.length === 0 ? (
        <EmptyState
          icon={
            <FileDiff className="h-6 w-6 text-[#4A5568]" strokeWidth={1.5} />
          }
          title="No change orders found"
          description="Create your first change order to track scope changes and their budget impact."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500"
            >
              New Change Order
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {changeOrders.map(
            (co: {
              id: string;
              coNumber: string;
              title: string;
              description?: string;
              status: string;
              priority: string;
              estimatedCost?: number;
              approvedCost?: number;
              scheduleDays?: number;
              scheduleImpact?: boolean;
              createdAt: string;
              submittedAt?: string;
              approvedAt?: string;
              rejectionReason?: string;
              requester?: { name: string };
              approvedBy?: { name: string };
              items?: {
                id: string;
                category: string;
                description: string;
                quantity: number;
                unitCost: number;
                totalCost: number;
              }[];
            }) => (
              <div
                key={co.id}
                className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-0.5">
                      {co.status === "approved" ? (
                        <CheckCircle className="h-4 w-4 text-[#4A9079]" />
                      ) : co.status === "rejected" ? (
                        <XCircle className="h-4 w-4 text-[#9E534F]" />
                      ) : co.status === "submitted" ||
                        co.status === "under_review" ? (
                        <Clock className="h-4 w-4 text-[#A68B5B]" />
                      ) : (
                        <FileDiff className="h-4 w-4 text-[#718096]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] text-[#4A5568] font-mono">
                          {co.coNumber}
                        </span>
                        <StatusBadge
                          variant={
                            CHANGE_ORDER_STATUS_VARIANT[co.status] ?? "neutral"
                          }
                          label={co.status.replace(/_/g, " ")}
                        />
                        {co.priority !== "medium" && (
                          <span
                            className={`text-[10px] uppercase tracking-wider ${
                              co.priority === "urgent" || co.priority === "high"
                                ? "text-[#9E534F]"
                                : "text-[#718096]"
                            }`}
                          >
                            {co.priority === "urgent" && (
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                            )}
                            {co.priority}
                          </span>
                        )}
                      </div>
                      <h3 className="text-white font-medium mb-1">
                        {co.title}
                      </h3>
                      {co.description && (
                        <p className="text-xs text-[#718096] mb-2 line-clamp-2">
                          {co.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-[#718096]">
                        {co.estimatedCost != null && (
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="h-3 w-3" />
                            Est: {formatCurrency(Number(co.estimatedCost))}
                          </span>
                        )}
                        {co.approvedCost != null &&
                          co.status === "approved" && (
                            <span className="flex items-center gap-1.5 text-[#4A9079]">
                              <CheckCircle className="h-3 w-3" />
                              Approved:{" "}
                              {formatCurrency(Number(co.approvedCost))}
                            </span>
                          )}
                        {co.scheduleImpact && co.scheduleDays && (
                          <span className="flex items-center gap-1.5 text-[#A68B5B]">
                            <Calendar className="h-3 w-3" />+{co.scheduleDays}{" "}
                            days
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(co.createdAt).toLocaleDateString()}
                        </span>
                        {co.requester && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {co.requester.name}
                          </span>
                        )}
                      </div>

                      {/* Items summary */}
                      {co.items && co.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#1A1A1A]">
                          <p className="text-[10px] text-[#4A5568] uppercase tracking-wider mb-2">
                            Line Items ({co.items.length})
                          </p>
                          <div className="space-y-1">
                            {co.items.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-[#718096]">
                                  <span className="text-[#4A5568] uppercase mr-2">
                                    {item.category}
                                  </span>
                                  {item.description}
                                </span>
                                <span className="text-white font-mono">
                                  {formatCurrency(Number(item.totalCost))}
                                </span>
                              </div>
                            ))}
                            {co.items.length > 3 && (
                              <p className="text-[10px] text-[#4A5568]">
                                +{co.items.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {co.rejectionReason && (
                        <p className="text-xs text-[#9E534F] mt-2">
                          Rejected: {co.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {co.status === "draft" && (
                      <>
                        <button
                          onClick={() => submitMutation.mutate(co.id)}
                          className="p-2 text-[#A68B5B] hover:bg-[#A68B5B]/10 transition-colors"
                          title="Submit for Review"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowAddItem(co.id)}
                          className="p-2 text-[#718096] hover:bg-white/5 transition-colors"
                          title="Add Line Item"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(co.id)}
                          className="p-2 text-[#9E534F] hover:bg-[#9E534F]/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {["submitted", "under_review"].includes(co.status) && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate(co.id)}
                          className="p-2 text-[#4A9079] hover:bg-[#4A9079]/10 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRejectingId(co.id)}
                          className="p-2 text-[#9E534F] hover:bg-[#9E534F]/10 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowAddItem(co.id)}
                          className="p-2 text-[#718096] hover:bg-white/5 transition-colors"
                          title="Add Line Item"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <h2 className="text-white font-medium">New Change Order</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-[#4A5568] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Owner Requested Kitchen Upgrade"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Drawing Ref
                  </label>
                  <input
                    type="text"
                    value={form.drawingRef}
                    onChange={(e) =>
                      setForm({ ...form, drawingRef: e.target.value })
                    }
                    placeholder="e.g., A-201"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Reason / Justification
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  placeholder="Why is this change needed?"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Detailed description of the scope change..."
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A]">
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 text-xs text-[#718096] hover:text-white transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title || createMutation.isPending}
                className="px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider hover:bg-[#B89C6C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Line Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <h2 className="text-white font-medium">Add Line Item</h2>
              <button
                onClick={() => setShowAddItem(null)}
                className="text-[#4A5568] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Category *
                  </label>
                  <select
                    value={itemForm.category}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, category: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={itemForm.quantity}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, quantity: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                  placeholder="e.g., Additional concrete pour — Section B"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Unit Cost ($) *
                </label>
                <input
                  type="number"
                  value={itemForm.unitCost}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, unitCost: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A]">
              <button
                onClick={() => setShowAddItem(null)}
                className="px-5 py-2.5 text-xs text-[#718096] hover:text-white transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddItem(showAddItem)}
                disabled={
                  !itemForm.description ||
                  !itemForm.unitCost ||
                  addItemMutation.isPending
                }
                className="px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider hover:bg-[#B89C6C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addItemMutation.isPending ? "Adding..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <h2 className="text-white font-medium">Reject Change Order</h2>
              <button
                onClick={() => setRejectingId(null)}
                className="text-[#4A5568] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain why this change order is being rejected..."
                className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A]">
              <button
                onClick={() => setRejectingId(null)}
                className="px-5 py-2.5 text-xs text-[#718096] hover:text-white transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectingId,
                    reason: rejectReason,
                  })
                }
                disabled={!rejectReason || rejectMutation.isPending}
                className="px-5 py-2.5 bg-[#9E534F] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#B06460] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
