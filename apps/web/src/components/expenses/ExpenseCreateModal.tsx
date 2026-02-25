import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X, Upload, CheckCircle2 } from "lucide-react";
import { expenseApi, projectsApi } from "@/lib/api";

interface ExpenseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ExpenseCreateModalProps) {
  const [formData, setFormData] = useState({
    projectId: "",
    amount: "",
    currency: "USD",
    vendor: "",
    description: "",
    category: "materials",
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list().then((res) => res.data),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string | number>) => {
      // 1. Create expense
      const res = await expenseApi.create(data);
      const expenseId = res.data.data.id;

      // 2. Upload receipt if exists
      if (file && expenseId) {
        await expenseApi.uploadReceipt(expenseId, file);
      }
      return res.data;
    },
    onSuccess,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const CATEGORIES = [
    { value: "materials", label: "Materials" },
    { value: "labor", label: "Labor" },
    { value: "equipment", label: "Equipment" },
    { value: "permits", label: "Permits" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#1A1A1A] sticky top-0 bg-[#0A0A0A] z-10">
          <div>
            <h2 className="text-lg font-medium text-white tracking-tight">
              Log Expense
            </h2>
            <p className="text-xs text-[#4A5568] mt-1">
              Record a new project cost.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#4A5568] hover:text-white hover:bg-white/[0.05] rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2 block">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A5568]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full pl-8 pr-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2 block">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expenseDate: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2 block">
                Description *
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                placeholder="e.g. Lumber delivery for framing"
              />
            </div>

            {/* Project & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2 block">
                  Project
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) =>
                    setFormData({ ...formData, projectId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                >
                  <option value="">-- Unassigned --</option>
                  {projectsData?.data?.items?.map(
                    (p: { id: string; name: string }) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2 block">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vendor */}
            <div>
              <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2 block">
                Vendor
              </label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) =>
                  setFormData({ ...formData, vendor: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B] transition-colors"
                placeholder="e.g. Home Depot"
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2 block">
                Receipt / Invoice
              </label>

              <div
                className={`border border-dashed border-[#2A2A2A] rounded p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-colors ${file ? "bg-white/[0.02] border-[#A68B5B]/50" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf"
                />

                {file ? (
                  <div className="flex flex-col items-center text-center">
                    <CheckCircle2 className="h-8 w-8 text-[#A68B5B] mb-2" />
                    <p className="text-sm text-white font-medium">
                      {file.name}
                    </p>
                    <p className="text-xs text-[#4A5568] mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center text-[#4A5568]">
                    <Upload className="h-8 w-8 mb-2" />
                    <p className="text-sm font-medium">
                      Click to upload receipt
                    </p>
                    <p className="text-xs mt-1">PDF, JPG, PNG (Max 5MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1A1A1A] flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium tracking-[0.1em] text-[#4A5568] uppercase hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.amount ||
                !formData.description
              }
              className="px-6 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] disabled:opacity-50 transition-colors shadow-lg shadow-[#A68B5B]/20"
            >
              {createMutation.isPending ? "Logging..." : "Log Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
