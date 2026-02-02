import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@buildtrack/shared";

const statusConfig: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "bg-gray-100 text-gray-600",
    label: "Pending",
  },
  submitted: {
    icon: FileCheck,
    color: "bg-blue-100 text-blue-600",
    label: "Submitted",
  },
  under_review: {
    icon: Clock,
    color: "bg-amber-100 text-amber-600",
    label: "Under Review",
  },
  approved: {
    icon: CheckCircle,
    color: "bg-green-100 text-green-600",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    color: "bg-red-100 text-red-600",
    label: "Rejected",
  },
  expired: {
    icon: AlertTriangle,
    color: "bg-red-100 text-red-600",
    label: "Expired",
  },
};

export function PermitsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["permits", projectId],
    queryFn: () => api.get(`/permits/projects/${projectId}`),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/permits", { ...data, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permits"] });
      setShowCreate(false);
    },
  });

  const permits = data?.data?.data || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Permits</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Permit
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : permits.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900">No permits tracked</h3>
          <p className="text-gray-500">Add permits to track their status.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {permits.map((permit: any) => {
            const config = statusConfig[permit.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div
                key={permit.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {permit.permitType}
                    </h3>
                    {permit.permitNumber && (
                      <p className="text-sm text-gray-500">
                        #{permit.permitNumber}
                      </p>
                    )}
                    {permit.issuingAgency && (
                      <p className="text-sm text-gray-500">
                        {permit.issuingAgency}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${config.color}`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {config.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  {permit.submittedAt && (
                    <div>
                      <span className="text-gray-500">Submitted:</span>{" "}
                      {new Date(permit.submittedAt).toLocaleDateString()}
                    </div>
                  )}
                  {permit.approvedAt && (
                    <div>
                      <span className="text-gray-500">Approved:</span>{" "}
                      {new Date(permit.approvedAt).toLocaleDateString()}
                    </div>
                  )}
                  {permit.expiresAt && (
                    <div
                      className={
                        permit.isExpired
                          ? "text-red-600"
                          : permit.isExpiringSoon
                            ? "text-amber-600"
                            : ""
                      }
                    >
                      <span className="text-gray-500">Expires:</span>{" "}
                      {new Date(permit.expiresAt).toLocaleDateString()}
                      {permit.daysToExpiry !== null &&
                        permit.daysToExpiry > 0 &&
                        !permit.isExpired && (
                          <span className="ml-1">
                            ({permit.daysToExpiry} days)
                          </span>
                        )}
                      {permit.isExpired && (
                        <span className="ml-1">(Expired)</span>
                      )}
                    </div>
                  )}
                </div>

                {permit.fees && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                    <span className="text-gray-500">Fees:</span>{" "}
                    {formatCurrency(Number(permit.fees))}
                  </div>
                )}

                {(permit.isExpired || permit.isExpiringSoon) && (
                  <div
                    className={`mt-3 p-2 rounded-lg ${permit.isExpired ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"} text-sm flex items-center gap-2`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {permit.isExpired
                      ? "This permit has expired. Renewal required."
                      : "This permit is expiring soon."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Permit</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate({
                  permitType: formData.get("permitType"),
                  permitNumber: formData.get("permitNumber") || undefined,
                  issuingAgency: formData.get("issuingAgency") || undefined,
                  fees: formData.get("fees")
                    ? Number(formData.get("fees"))
                    : undefined,
                  expiresAt: formData.get("expiresAt") || undefined,
                  notes: formData.get("notes") || undefined,
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permit Type *
                  </label>
                  <select
                    name="permitType"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Select type</option>
                    <option value="Building Permit">Building Permit</option>
                    <option value="Electrical Permit">Electrical Permit</option>
                    <option value="Plumbing Permit">Plumbing Permit</option>
                    <option value="HVAC Permit">HVAC Permit</option>
                    <option value="Demolition Permit">Demolition Permit</option>
                    <option value="Zoning Approval">Zoning Approval</option>
                    <option value="Environmental Permit">
                      Environmental Permit
                    </option>
                    <option value="Fire Safety Permit">
                      Fire Safety Permit
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Permit Number
                    </label>
                    <input
                      name="permitNumber"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issuing Agency
                    </label>
                    <input
                      name="issuingAgency"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fees ($)
                    </label>
                    <input
                      name="fees"
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expires On
                    </label>
                    <input
                      name="expiresAt"
                      type="date"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Adding..." : "Add Permit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
