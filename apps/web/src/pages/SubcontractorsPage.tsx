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
import type { AxiosError } from "axios";

/** Strip empty-string values so optional fields don't fail Zod validation */
function sanitizeFormData(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== "" && value !== null && value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Vendors
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Subcontractors
          </h1>
          <p className="text-sm text-[#4A5568] mt-1">
            Manage your vendor database and compliance
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors duration-300"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Subcontractor
        </button>
      </div>

      {/* Compliance Alerts */}
      {(expiring.insurance.length > 0 || expiring.license.length > 0) && (
        <div className="bg-[#9E534F]/10 border border-[#9E534F]/30 p-5 mb-8">
          <h3 className="font-medium text-[#E8A87C] flex items-center gap-2 mb-4 text-sm">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            Compliance Alerts
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {expiring.insurance.length > 0 && (
              <div>
                <p className="text-xs text-[#D4796E] tracking-wide uppercase mb-2">
                  Insurance Expiring
                </p>
                {expiring.insurance
                  .slice(0, 3)
                  .map(
                    (s: {
                      id: string;
                      companyName: string;
                      daysRemaining: number;
                    }) => (
                      <p key={s.id} className="text-sm text-[#E1E1E1] py-1">
                        {s.companyName}{" "}
                        <span className="text-[#D4796E]">
                          — {s.daysRemaining} days
                        </span>
                      </p>
                    ),
                  )}
              </div>
            )}
            {expiring.license.length > 0 && (
              <div>
                <p className="text-xs text-[#D4796E] tracking-wide uppercase mb-2">
                  License Expiring
                </p>
                {expiring.license.slice(0, 3).map((s: ExpiringSubEntry) => (
                  <p key={s.id} className="text-sm text-[#E1E1E1] py-1">
                    {s.companyName}{" "}
                    <span className="text-[#D4796E]">
                      — {s.daysRemaining} days
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
        <input
          type="text"
          placeholder="Search by company, contact, or trade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors duration-300"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-16 text-center text-[#4A5568]">Loading...</div>
      ) : subcontractors.length === 0 ? (
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A]">
          <Building2
            className="h-12 w-12 text-[#2A2A2A] mx-auto mb-4"
            strokeWidth={1}
          />
          <h3 className="font-medium text-white mb-2">
            No subcontractors found
          </h3>
          <p className="text-[#4A5568] text-sm">
            Add your first subcontractor to get started.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subcontractors.map((sub: SubcontractorItem) => (
            <div
              key={sub.id}
              className="group bg-[#0A0A0A] border border-[#1A1A1A] p-5 hover:border-[#2A2A2A] transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-white group-hover:text-[#A68B5B] transition-colors duration-300">
                    {sub.companyName}
                  </h3>
                  {sub.trade && (
                    <span className="text-xs text-[#A68B5B] tracking-wide uppercase mt-1 inline-block">
                      {sub.trade}
                    </span>
                  )}
                </div>
                {sub.isActive ? (
                  <span className="px-2.5 py-1 text-xs bg-[#4A9079]/20 text-[#4A9079] tracking-wide uppercase">
                    Active
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs bg-[#4A5568]/20 text-[#4A5568] tracking-wide uppercase">
                    Inactive
                  </span>
                )}
              </div>

              {sub.contactName && (
                <p className="text-sm text-[#E1E1E1] mb-3">{sub.contactName}</p>
              )}

              <div className="space-y-1.5 text-sm">
                {sub.phone && (
                  <p className="flex items-center gap-2 text-[#4A5568]">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {sub.phone}
                  </p>
                )}
                {sub.email && (
                  <p className="flex items-center gap-2 text-[#4A5568]">
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {sub.email}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[#1A1A1A] flex items-center justify-between text-xs">
                <span className="text-[#4A5568]">
                  {sub._count?.tasks || 0} tasks
                </span>
                <div className="flex gap-3">
                  {sub.insuranceExpiring && (
                    <span className="text-[#D4796E] flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Insurance
                    </span>
                  )}
                  {sub.licenseExpiring && (
                    <span className="text-[#D4796E] flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      License
                    </span>
                  )}
                  {!sub.insuranceExpiring &&
                    !sub.licenseExpiring &&
                    sub.insuranceExpiry && (
                      <span className="text-[#4A9079] flex items-center gap-1">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1A1A1A] w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-white mb-1">
              Add Subcontractor
            </h2>
            <p className="text-xs text-[#4A5568] mb-6">
              Register a new vendor in your database
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate(
                  sanitizeFormData({
                    companyName: formData.get("companyName"),
                    contactName: formData.get("contactName"),
                    email: formData.get("email"),
                    phone: formData.get("phone"),
                    trade: formData.get("trade"),
                    licenseNumber: formData.get("licenseNumber"),
                  }),
                );
              }}
            >
              {createMutation.isError && (
                <div className="mb-4 p-3 bg-[#9E534F]/10 border border-[#9E534F]/30 text-sm text-[#D4796E]">
                  {(
                    createMutation.error as AxiosError<{
                      error?: { message?: string };
                    }>
                  )?.response?.data?.error?.message ||
                    "Failed to add subcontractor"}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Company Name *
                  </label>
                  <input
                    name="companyName"
                    required
                    className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                      Contact Name
                    </label>
                    <input
                      name="contactName"
                      className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                      Trade
                    </label>
                    <input
                      name="trade"
                      placeholder="e.g., Electrical"
                      className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                      Phone
                    </label>
                    <input
                      name="phone"
                      className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    License Number
                  </label>
                  <input
                    name="licenseNumber"
                    className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-[#1A1A1A] text-[#E1E1E1] text-sm hover:bg-white/[0.03] hover:border-[#2A2A2A] transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-sm font-medium hover:bg-[#8A7048] disabled:opacity-50 transition-colors duration-300"
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
