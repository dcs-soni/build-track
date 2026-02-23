import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface ExpiringSubEntry {
  id: string;
  companyName: string;
  daysRemaining: number;
}

interface SubcontractorItem {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  trade?: string;
  status?: string;
  projectCount?: number;
  insuranceExpiry?: string;
  licenseExpiry?: string;
  isActive: boolean;
  _count?: {
    tasks: number;
  };
  insuranceExpiring?: boolean;
  licenseExpiring?: boolean;
}

export function SubcontractorsPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["subcontractors", search],
    queryFn: () => api.get("/subcontractors", { params: { search } }),
  });

  const { data: expiringData } = useQuery({
    queryKey: ["subcontractors-expiring"],
    queryFn: () => api.get("/subcontractors/compliance/expiring"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/subcontractors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setShowCreate(false);
    },
  });

  const subcontractors = data?.data?.data?.items || [];
  const expiring = expiringData?.data?.data || { insurance: [], license: [] };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subcontractors</h1>
          <p className="text-gray-500">
            Manage your vendor database and compliance
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Subcontractor
        </button>
      </div>

      {/* Compliance Alerts */}
      {(expiring.insurance.length > 0 || expiring.license.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-amber-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" />
            Compliance Alerts
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {expiring.insurance.length > 0 && (
              <div>
                <p className="text-sm text-amber-700 mb-2">
                  Insurance Expiring:
                </p>
                {expiring.insurance
                  .slice(0, 3)
                  .map(
                    (s: {
                      id: string;
                      companyName: string;
                      daysRemaining: number;
                    }) => (
                      <p key={s.id} className="text-sm text-gray-700">
                        {s.companyName} - {s.daysRemaining} days
                      </p>
                    ),
                  )}
              </div>
            )}
            {expiring.license.length > 0 && (
              <div>
                <p className="text-sm text-amber-700 mb-2">License Expiring:</p>
                {expiring.license.slice(0, 3).map((s: ExpiringSubEntry) => (
                  <p key={s.id} className="text-sm text-gray-700">
                    {s.companyName} - {s.daysRemaining} days
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by company, contact, or trade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : subcontractors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900">No subcontractors found</h3>
          <p className="text-gray-500">
            Add your first subcontractor to get started.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subcontractors.map((sub: SubcontractorItem) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {sub.companyName}
                  </h3>
                  {sub.trade && (
                    <span className="text-sm text-blue-600">{sub.trade}</span>
                  )}
                </div>
                {sub.isActive ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    Inactive
                  </span>
                )}
              </div>

              {sub.contactName && (
                <p className="text-sm text-gray-600 mb-2">{sub.contactName}</p>
              )}

              <div className="space-y-1 text-sm">
                {sub.phone && (
                  <p className="flex items-center gap-2 text-gray-500">
                    <Phone className="h-4 w-4" />
                    {sub.phone}
                  </p>
                )}
                {sub.email && (
                  <p className="flex items-center gap-2 text-gray-500">
                    <Mail className="h-4 w-4" />
                    {sub.email}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  {sub._count?.tasks || 0} tasks
                </span>
                <div className="flex gap-2">
                  {sub.insuranceExpiring && (
                    <span className="text-amber-600">⚠ Insurance</span>
                  )}
                  {sub.licenseExpiring && (
                    <span className="text-amber-600">⚠ License</span>
                  )}
                  {!sub.insuranceExpiring &&
                    !sub.licenseExpiring &&
                    sub.insuranceExpiry && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Compliant
                      </span>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add Subcontractor
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate({
                  companyName: formData.get("companyName"),
                  contactName: formData.get("contactName"),
                  email: formData.get("email"),
                  phone: formData.get("phone"),
                  trade: formData.get("trade"),
                  licenseNumber: formData.get("licenseNumber"),
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    name="companyName"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      name="contactName"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trade
                    </label>
                    <input
                      name="trade"
                      placeholder="e.g., Electrical"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      name="phone"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    name="licenseNumber"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  {createMutation.isPending ? "Adding..." : "Add Subcontractor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
