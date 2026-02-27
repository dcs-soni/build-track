import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  ListChecks,
  Plus,
  X,
  Calendar,
  MapPin,
  CheckCircle,
  ArrowLeft,
  User,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { punchListApi } from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { PUNCH_LIST_STATUS_VARIANT } from "@/lib/constants";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "structural", label: "Structural" },
  { value: "finish", label: "Finish" },
  { value: "landscape", label: "Landscape" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "verified", label: "Verified" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-[#718096]",
  medium: "text-[#A68B5B]",
  high: "text-[#D97706]",
  critical: "text-[#9E534F]",
};

interface PunchForm {
  title: string;
  category: string;
  priority: string;
  location: string;
  floor: string;
  room: string;
  description: string;
  dueDate: string;
}

const defaultForm: PunchForm = {
  title: "",
  category: "general",
  priority: "medium",
  location: "",
  floor: "",
  room: "",
  description: "",
  dueDate: "",
};

export function PunchListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [form, setForm] = useState<PunchForm>(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ["punch-list", projectId, statusFilter],
    queryFn: () =>
      punchListApi.listByProject(projectId!, {
        ...(statusFilter && { status: statusFilter }),
      }),
    enabled: !!projectId,
  });

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => punchListApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["punch-list", projectId] });
      setShowCreate(false);
      setForm(defaultForm);
    },
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      punchListApi.resolve(id, { resolution }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["punch-list", projectId] });
      setResolveId(null);
      setResolution("");
    },
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => punchListApi.verify(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["punch-list", projectId] });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data?.data?.data as any[]) ?? [];

  const handleCreate = () => {
    createMut.mutate({
      projectId,
      title: form.title,
      category: form.category,
      priority: form.priority,
      location: form.location || undefined,
      floor: form.floor || undefined,
      room: form.room || undefined,
      description: form.description || undefined,
      dueDate: form.dueDate || undefined,
    });
  };

  const openCount = items.filter(
    (i: { status: string }) =>
      i.status === "open" || i.status === "in_progress",
  ).length;
  const resolvedCount = items.filter(
    (i: { status: string }) => i.status === "resolved",
  ).length;
  const verifiedCount = items.filter(
    (i: { status: string }) => i.status === "verified",
  ).length;

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border border-[#A68B5B] border-t-transparent animate-spin" />
      </div>
    );

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-[#718096] hover:text-[#A68B5B] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project
        </Link>
      </div>

      <PageHeader
        label="Pre-Closeout"
        title="Punch List"
        description="Track defects and outstanding items before project handover."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Open",
            count: openCount,
            icon: AlertTriangle,
            color: "text-[#A68B5B]",
          },
          {
            label: "Resolved",
            count: resolvedCount,
            icon: CheckCircle,
            color: "text-[#4A9079]",
          },
          {
            label: "Verified",
            count: verifiedCount,
            icon: ShieldCheck,
            color: "text-[#6366F1]",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-[#0A0A0A] border border-[#1A1A1A] p-4"
          >
            <div className="flex items-center gap-3">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <div>
                <p className="text-2xl font-medium text-white">{c.count}</p>
                <p className="text-xs text-[#718096] uppercase tracking-wider">
                  {c.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 mb-6 border-b border-[#1A1A1A]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2.5 text-xs font-medium tracking-wide transition-all duration-300 border-b-2 ${statusFilter === tab.value ? "text-[#A68B5B] border-[#A68B5B]" : "text-[#718096] border-transparent hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={
            <ListChecks className="h-6 w-6 text-[#4A5568]" strokeWidth={1.5} />
          }
          title="No punch list items"
          description="Add items that need attention before project closeout."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500"
            >
              Add First Item
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map(
            (item: {
              id: string;
              itemNumber: string;
              title: string;
              category: string;
              priority: string;
              status: string;
              location?: string;
              floor?: string;
              room?: string;
              dueDate?: string;
              isOverdue?: boolean;
              assignedTo?: { name: string };
              resolution?: string;
            }) => (
              <div
                key={item.id}
                className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] text-[#4A5568] font-mono">
                        {item.itemNumber}
                      </span>
                      <StatusBadge
                        variant={
                          PUNCH_LIST_STATUS_VARIANT[item.status] ?? "neutral"
                        }
                        label={item.status.replace(/_/g, " ")}
                      />
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wider ${PRIORITY_COLORS[item.priority] ?? "text-[#718096]"}`}
                      >
                        {item.priority}
                      </span>
                      {item.isOverdue && (
                        <span className="text-[10px] font-medium text-[#9E534F] uppercase tracking-wider">
                          Overdue
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-medium mb-1">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-xs text-[#718096]">
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-3 w-3" />
                        {CATEGORIES.find((c) => c.value === item.category)
                          ?.label ?? item.category}
                      </span>
                      {(item.location || item.floor || item.room) && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {[item.location, item.floor, item.room]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          Due {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {item.assignedTo && (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          {item.assignedTo.name}
                        </span>
                      )}
                    </div>
                    {item.resolution && (
                      <p className="text-xs text-[#4A9079] mt-2">
                        Resolution: {item.resolution}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {["open", "in_progress"].includes(item.status) && (
                      <button
                        onClick={() => setResolveId(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#4A9079] border border-[#4A9079]/30 hover:bg-[#4A9079]/10 transition-colors"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Resolve
                      </button>
                    )}
                    {item.status === "resolved" && (
                      <button
                        onClick={() => verifyMut.mutate(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 hover:bg-[#6366F1]/10 transition-colors"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Resolve Modal */}
      {resolveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <h2 className="text-white font-medium">Resolve Item</h2>
              <button
                onClick={() => {
                  setResolveId(null);
                  setResolution("");
                }}
                className="text-[#4A5568] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                Resolution Details *
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                placeholder="Describe how this item was resolved..."
                className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1A1A1A]">
              <button
                onClick={() => {
                  setResolveId(null);
                  setResolution("");
                }}
                className="px-5 py-2.5 text-xs text-[#718096] hover:text-white transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMut.mutate({ id: resolveId, resolution })}
                disabled={!resolution || resolveMut.isPending}
                className="px-5 py-2.5 bg-[#4A9079] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#5AA88A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resolveMut.isPending ? "Resolving..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <h2 className="text-white font-medium">Add Punch List Item</h2>
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
                  placeholder="e.g., Cracked tile in lobby"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="Building A"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={form.floor}
                    onChange={(e) =>
                      setForm({ ...form, floor: e.target.value })
                    }
                    placeholder="2nd Floor"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Room
                  </label>
                  <input
                    type="text"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    placeholder="Room 201"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
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
                  placeholder="Describe the defect..."
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
                disabled={!form.title || createMut.isPending}
                className="px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider hover:bg-[#B89C6C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMut.isPending ? "Creating..." : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
