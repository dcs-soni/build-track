import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  X,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  User,
  AlertTriangle,
} from "lucide-react";
import { inspectionApi } from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { INSPECTION_STATUS_VARIANT } from "@/lib/constants";

const INSPECTION_TYPES = [
  { value: "structural", label: "Structural" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "fire_safety", label: "Fire Safety" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "foundation", label: "Foundation" },
  { value: "final", label: "Final" },
  { value: "other", label: "Other" },
];

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "needs_reinspection", label: "Needs Re-inspection" },
];

interface CreateForm {
  title: string;
  inspectionType: string;
  scheduledDate: string;
  scheduledTime: string;
  inspectorName: string;
  inspectorCompany: string;
  location: string;
  description: string;
}

const defaultForm: CreateForm = {
  title: "",
  inspectionType: "structural",
  scheduledDate: "",
  scheduledTime: "",
  inspectorName: "",
  inspectorCompany: "",
  location: "",
  description: "",
};

export function InspectionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ["inspections", projectId, statusFilter],
    queryFn: () =>
      inspectionApi.listByProject(projectId!, {
        ...(statusFilter && { status: statusFilter }),
      }),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => inspectionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections", projectId] });
      setShowCreate(false);
      setForm(defaultForm);
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      inspectionApi.complete(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections", projectId] });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inspections = (data?.data?.data as any[]) ?? [];

  const handleCreate = () => {
    createMutation.mutate({
      projectId,
      title: form.title,
      inspectionType: form.inspectionType,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime || undefined,
      inspectorName: form.inspectorName || undefined,
      inspectorCompany: form.inspectorCompany || undefined,
      location: form.location || undefined,
      description: form.description || undefined,
    });
  };

  const getResultIcon = (status: string, result?: string) => {
    if (status === "passed" || result === "pass")
      return <CheckCircle className="h-4 w-4 text-[#4A9079]" />;
    if (status === "failed" || result === "fail")
      return <XCircle className="h-4 w-4 text-[#9E534F]" />;
    if (status === "needs_reinspection")
      return <AlertTriangle className="h-4 w-4 text-[#A68B5B]" />;
    return <Clock className="h-4 w-4 text-[#718096]" />;
  };

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
        label="Quality Assurance"
        title="Inspections"
        description="Schedule and track construction inspections, record pass/fail results, and manage deficiencies."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500"
          >
            <Plus className="h-4 w-4" />
            Schedule Inspection
          </button>
        }
      />

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

      {/* Inspections List */}
      {inspections.length === 0 ? (
        <EmptyState
          icon={
            <ClipboardCheck
              className="h-6 w-6 text-[#4A5568]"
              strokeWidth={1.5}
            />
          }
          title="No inspections found"
          description="Schedule your first inspection to track quality assurance on this project."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500"
            >
              Schedule Inspection
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {inspections.map(
            (inspection: {
              id: string;
              inspectionNumber: string;
              title: string;
              inspectionType: string;
              status: string;
              result?: string;
              scheduledDate: string;
              scheduledTime?: string;
              completedDate?: string;
              inspectorName?: string;
              location?: string;
              findings?: string;
              deficiencies?: string;
              creator?: { name: string };
            }) => (
              <div
                key={inspection.id}
                className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-0.5">
                      {getResultIcon(inspection.status, inspection.result)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] text-[#4A5568] font-mono">
                          {inspection.inspectionNumber}
                        </span>
                        <StatusBadge
                          variant={
                            INSPECTION_STATUS_VARIANT[inspection.status] ??
                            "neutral"
                          }
                          label={inspection.status.replace(/_/g, " ")}
                        />
                      </div>
                      <h3 className="text-white font-medium mb-1">
                        {inspection.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-xs text-[#718096]">
                        <span className="flex items-center gap-1.5">
                          <ClipboardCheck className="h-3 w-3" />
                          {INSPECTION_TYPES.find(
                            (t) => t.value === inspection.inspectionType,
                          )?.label ?? inspection.inspectionType}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(
                            inspection.scheduledDate,
                          ).toLocaleDateString()}
                          {inspection.scheduledTime &&
                            ` at ${inspection.scheduledTime}`}
                        </span>
                        {inspection.inspectorName && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {inspection.inspectorName}
                          </span>
                        )}
                        {inspection.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {inspection.location}
                          </span>
                        )}
                      </div>
                      {inspection.deficiencies && (
                        <p className="text-xs text-[#9E534F] mt-2 line-clamp-2">
                          Deficiencies: {inspection.deficiencies}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  {["scheduled", "in_progress"].includes(inspection.status) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          completeMutation.mutate({
                            id: inspection.id,
                            data: { result: "pass" },
                          })
                        }
                        className="p-2 text-[#4A9079] hover:bg-[#4A9079]/10 transition-colors"
                        title="Mark as Passed"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          completeMutation.mutate({
                            id: inspection.id,
                            data: { result: "fail" },
                          })
                        }
                        className="p-2 text-[#9E534F] hover:bg-[#9E534F]/10 transition-colors"
                        title="Mark as Failed"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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
              <h2 className="text-white font-medium">Schedule Inspection</h2>
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
                  placeholder="e.g., Foundation Inspection"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Type *
                  </label>
                  <select
                    value={form.inspectionType}
                    onChange={(e) =>
                      setForm({ ...form, inspectionType: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  >
                    {INSPECTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Scheduled Date *
                  </label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) =>
                      setForm({ ...form, scheduledDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Time
                  </label>
                  <input
                    type="text"
                    value={form.scheduledTime}
                    onChange={(e) =>
                      setForm({ ...form, scheduledTime: e.target.value })
                    }
                    placeholder="e.g., 09:00 AM"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
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
                    placeholder="e.g., Building A, Floor 2"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={form.inspectorName}
                    onChange={(e) =>
                      setForm({ ...form, inspectorName: e.target.value })
                    }
                    placeholder="Inspector name"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Inspector Company
                  </label>
                  <input
                    type="text"
                    value={form.inspectorCompany}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        inspectorCompany: e.target.value,
                      })
                    }
                    placeholder="Company name"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
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
                  placeholder="Additional details about the inspection..."
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
                disabled={
                  !form.title || !form.scheduledDate || createMutation.isPending
                }
                className="px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium uppercase tracking-wider hover:bg-[#B89C6C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? "Creating..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
