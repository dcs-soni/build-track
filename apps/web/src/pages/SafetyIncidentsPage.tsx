import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  ShieldAlert,
  Plus,
  X,
  Calendar,
  MapPin,
  ArrowLeft,
  User,
  Search as SearchIcon,
  AlertTriangle,
} from "lucide-react";
import { safetyIncidentApi } from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui";
import { SAFETY_STATUS_VARIANT } from "@/lib/constants";

const INCIDENT_TYPES = [
  { value: "near_miss", label: "Near Miss" },
  { value: "first_aid", label: "First Aid" },
  { value: "recordable", label: "Recordable" },
  { value: "lost_time", label: "Lost Time" },
  { value: "property_damage", label: "Property Damage" },
  { value: "environmental", label: "Environmental" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "reported", label: "Reported" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-[#718096]/10 text-[#718096] border-[#718096]/20",
  medium: "bg-[#A68B5B]/10 text-[#A68B5B] border-[#A68B5B]/20",
  high: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20",
  critical: "bg-[#9E534F]/10 text-[#9E534F] border-[#9E534F]/20",
};

interface IncidentForm {
  title: string;
  description: string;
  incidentType: string;
  severity: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  injuredParty: string;
  immediateAction: string;
}

const defaultForm: IncidentForm = {
  title: "",
  description: "",
  incidentType: "near_miss",
  severity: "low",
  incidentDate: new Date().toISOString().split("T")[0],
  incidentTime: "",
  location: "",
  injuredParty: "",
  immediateAction: "",
};

export function SafetyIncidentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<IncidentForm>(defaultForm);

  const isProjectScoped = !!projectId;

  const { data, isLoading } = useQuery({
    queryKey: ["safety-incidents", projectId ?? "all", statusFilter],
    queryFn: () =>
      isProjectScoped
        ? safetyIncidentApi.listByProject(projectId!, {
            ...(statusFilter && { status: statusFilter }),
          })
        : safetyIncidentApi.list({
            ...(statusFilter && { status: statusFilter }),
          }),
  });

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => safetyIncidentApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safety-incidents"] });
      setShowCreate(false);
      setForm(defaultForm);
    },
  });

  const investigateMut = useMutation({
    mutationFn: (id: string) => safetyIncidentApi.investigate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safety-incidents"] });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incidents = (data?.data?.data as any[]) ?? [];

  const handleCreate = () => {
    if (!projectId) return;
    createMut.mutate({
      projectId,
      title: form.title,
      description: form.description,
      incidentType: form.incidentType,
      severity: form.severity,
      incidentDate: form.incidentDate,
      incidentTime: form.incidentTime || undefined,
      location: form.location || undefined,
      injuredParty: form.injuredParty || undefined,
      immediateAction: form.immediateAction || undefined,
    });
  };

  // Summary stats
  const reportedCount = incidents.filter(
    (i: { status: string }) => i.status === "reported",
  ).length;
  const investigatingCount = incidents.filter(
    (i: { status: string }) => i.status === "investigating",
  ).length;
  const criticalCount = incidents.filter(
    (i: { severity: string }) =>
      i.severity === "critical" || i.severity === "high",
  ).length;

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border border-[#A68B5B] border-t-transparent animate-spin" />
      </div>
    );

  return (
    <div>
      {isProjectScoped && (
        <div className="mb-6">
          <Link
            to={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-[#718096] hover:text-[#A68B5B] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Project
          </Link>
        </div>
      )}

      <PageHeader
        label="Health & Safety"
        title="Safety Incidents"
        description={
          isProjectScoped
            ? "Track and manage safety incidents for this project."
            : "View all safety incidents across your organization."
        }
        actions={
          isProjectScoped ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 border border-[#9E534F] text-[#9E534F] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#9E534F] hover:text-white transition-all duration-500"
            >
              <Plus className="h-4 w-4" />
              Report Incident
            </button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Reported", count: reportedCount, color: "text-[#A68B5B]" },
          {
            label: "Investigating",
            count: investigatingCount,
            color: "text-[#6366F1]",
          },
          {
            label: "High / Critical",
            count: criticalCount,
            color: "text-[#9E534F]",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#0A0A0A] border border-[#1A1A1A] p-4"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-medium text-white">{s.count}</p>
                <p className="text-xs text-[#718096] uppercase tracking-wider">
                  {s.label}
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

      {incidents.length === 0 ? (
        <EmptyState
          icon={
            <ShieldAlert className="h-6 w-6 text-[#4A5568]" strokeWidth={1.5} />
          }
          title="No safety incidents"
          description="No incidents have been reported. Safety first!"
          action={
            isProjectScoped ? (
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-2.5 border border-[#9E534F] text-[#9E534F] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#9E534F] hover:text-white transition-all duration-500"
              >
                Report Incident
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {incidents.map(
            (incident: {
              id: string;
              incidentNumber: string;
              title: string;
              incidentType: string;
              severity: string;
              status: string;
              incidentDate: string;
              incidentTime?: string;
              location?: string;
              injuredParty?: string;
              project?: { id: string; name: string };
              reporter?: { name: string };
            }) => (
              <div
                key={incident.id}
                className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-0.5">
                      <AlertTriangle
                        className={`h-4 w-4 ${incident.severity === "critical" ? "text-[#9E534F]" : incident.severity === "high" ? "text-[#D97706]" : "text-[#718096]"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-[10px] text-[#4A5568] font-mono">
                          {incident.incidentNumber}
                        </span>
                        <StatusBadge
                          variant={
                            SAFETY_STATUS_VARIANT[incident.status] ?? "neutral"
                          }
                          label={incident.status.replace(/_/g, " ")}
                        />
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest border ${SEVERITY_COLORS[incident.severity] ?? SEVERITY_COLORS.low}`}
                        >
                          {incident.severity}
                        </span>
                      </div>
                      <h3 className="text-white font-medium mb-1">
                        {incident.title}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-xs text-[#718096]">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="h-3 w-3" />
                          {INCIDENT_TYPES.find(
                            (t) => t.value === incident.incidentType,
                          )?.label ?? incident.incidentType}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(incident.incidentDate).toLocaleDateString()}
                          {incident.incidentTime &&
                            ` at ${incident.incidentTime}`}
                        </span>
                        {incident.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {incident.location}
                          </span>
                        )}
                        {incident.injuredParty && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {incident.injuredParty}
                          </span>
                        )}
                        {!isProjectScoped && incident.project && (
                          <span className="flex items-center gap-1.5">
                            <SearchIcon className="h-3 w-3" />
                            {incident.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {incident.status === "reported" && (
                    <button
                      onClick={() => investigateMut.mutate(incident.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#6366F1] border border-[#6366F1]/30 hover:bg-[#6366F1]/10 transition-colors"
                    >
                      <SearchIcon className="h-3 w-3" />
                      Investigate
                    </button>
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
              <h2 className="text-white font-medium">Report Safety Incident</h2>
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
                  placeholder="Brief title of the incident"
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Type *
                  </label>
                  <select
                    value={form.incidentType}
                    onChange={(e) =>
                      setForm({ ...form, incidentType: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Severity
                  </label>
                  <select
                    value={form.severity}
                    onChange={(e) =>
                      setForm({ ...form, severity: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.incidentDate}
                    onChange={(e) =>
                      setForm({ ...form, incidentDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Time
                  </label>
                  <input
                    type="text"
                    value={form.incidentTime}
                    onChange={(e) =>
                      setForm({ ...form, incidentTime: e.target.value })
                    }
                    placeholder="e.g., 02:30 PM"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="Where on site"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                    Injured Party
                  </label>
                  <input
                    type="text"
                    value={form.injuredParty}
                    onChange={(e) =>
                      setForm({ ...form, injuredParty: e.target.value })
                    }
                    placeholder="Name (if any)"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Detailed description of the incident..."
                  className="w-full px-4 py-2.5 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#718096] uppercase tracking-wider mb-2">
                  Immediate Action Taken
                </label>
                <textarea
                  value={form.immediateAction}
                  onChange={(e) =>
                    setForm({ ...form, immediateAction: e.target.value })
                  }
                  rows={2}
                  placeholder="What was done immediately..."
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
                  !form.title || !form.description || createMut.isPending
                }
                className="px-5 py-2.5 bg-[#9E534F] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#B06460] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMut.isPending ? "Reporting..." : "Report Incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
