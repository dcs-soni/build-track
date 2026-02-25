import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { equipmentApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  ArrowLeft,
  ArrowRight,
  Wrench,
  Truck,
  Shield,
  Laptop,
  Box,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Activity,
} from "lucide-react";

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  // Form states
  const [condition, setCondition] = useState("good");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["equipment", id],
    queryFn: () => equipmentApi.get(id!).then((res) => res.data),
    enabled: !!id,
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      equipmentApi.checkout(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", id] });
      setShowCheckout(false);
      setNotes("");
    },
  });

  const checkinMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      equipmentApi.checkin(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", id] });
      setShowCheckin(false);
      setNotes("");
    },
  });

  const equipment = data?.data;

  if (isLoading) {
    return <div className="p-8 text-[#4A5568]">Loading asset details...</div>;
  }

  if (!equipment) {
    return <div className="p-8 text-[#9E534F]">Asset not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "text-[#4A9079] bg-[#4A9079]/10 border-[#4A9079]/20";
      case "checked_out":
        return "text-[#A68B5B] bg-[#A68B5B]/10 border-[#A68B5B]/20";
      case "maintenance":
      case "retired":
      case "lost":
        return "text-[#9E534F] bg-[#9E534F]/10 border-[#9E534F]/20";
      default:
        return "text-gray-400 bg-gray-900 border-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "tool":
        return <Wrench className="h-6 w-6" />;
      case "vehicle":
      case "heavy_equipment":
        return <Truck className="h-6 w-6" />;
      case "safety":
        return <Shield className="h-6 w-6" />;
      case "electronics":
        return <Laptop className="h-6 w-6" />;
      default:
        return <Box className="h-6 w-6" />;
    }
  };

  const handleCheckout = () => {
    checkoutMutation.mutate({
      assignedToId: user?.id,
      projectId: projectId || undefined,
      conditionOut: condition,
      notesOut: notes,
    });
  };

  const handleCheckin = () => {
    checkinMutation.mutate({
      conditionIn: condition,
      notesIn: notes,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header & Back Link */}
      <div>
        <Link
          to="/equipment"
          className="inline-flex items-center gap-2 text-xs text-[#4A5568] hover:text-[#A68B5B] uppercase tracking-widest transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Equipment
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#111111] border border-[#2A2A2A] text-[#A68B5B]">
              {getCategoryIcon(equipment.category)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[#A68B5B] font-mono text-sm tracking-wider">
                  {equipment.assetTag}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 border uppercase tracking-widest ${getStatusColor(
                    equipment.status,
                  )}`}
                >
                  {equipment.status.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-3xl font-medium text-white tracking-tight">
                {equipment.name}
              </h1>
              <p className="text-sm text-[#4A5568] mt-1 capitalize">
                {equipment.category.replace("_", " ")}{" "}
                {equipment.manufacturer && `• ${equipment.manufacturer}`}{" "}
                {equipment.model && `• ${equipment.model}`}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {equipment.status === "available" && (
              <button
                onClick={() => {
                  setShowCheckout(true);
                  setCondition(equipment.condition);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                Check Out
              </button>
            )}
            {equipment.status === "checked_out" && (
              <button
                onClick={() => {
                  setShowCheckin(true);
                  setCondition(equipment.condition);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#111111] border border-[#2A2A2A] text-white text-xs font-medium tracking-[0.1em] uppercase hover:border-[#A68B5B] hover:text-[#A68B5B] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Check In
              </button>
            )}
          </div>
        </div>
      </div>

      {(showCheckout || showCheckin) && (
        <div className="bg-[#111111] border border-[#A68B5B]/30 p-6 space-y-4">
          <h2 className="text-sm font-medium text-[#E1E1E1] uppercase tracking-wider mb-4 border-b border-[#2A2A2A] pb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#A68B5B]" />
            {showCheckout ? "Check Out Asset" : "Check In Asset"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {showCheckout && (
                <div>
                  <label className="block text-xs text-[#4A5568] uppercase tracking-wider mb-2">
                    Project Assignment (Optional)
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="Enter Project ID"
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-[#4A5568] uppercase tracking-wider mb-2">
                  Condition Rating
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] text-sm capitalize"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="needs_repair">Needs Repair</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#4A5568] uppercase tracking-wider mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any visual damage or missing parts?"
                className="w-full min-h-[100px] p-4 bg-[#0A0A0A] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#2A2A2A]">
            <button
              onClick={() => {
                setShowCheckout(false);
                setShowCheckin(false);
              }}
              className="px-5 py-2 text-xs font-medium text-[#4A5568] uppercase hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={showCheckout ? handleCheckout : handleCheckin}
              disabled={checkoutMutation.isPending || checkinMutation.isPending}
              className="px-5 py-2 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] disabled:opacity-50 transition-colors"
            >
              {checkoutMutation.isPending || checkinMutation.isPending
                ? "Processing..."
                : showCheckout
                  ? "Confirm Check Out"
                  : "Confirm Check In"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Log */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h2 className="text-sm font-medium text-[#E1E1E1] uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#A68B5B]" />
              Assignment History
            </h2>

            {equipment.assignments?.length === 0 ? (
              <p className="text-[#4A5568] text-sm text-center py-4">
                No assignment history found.
              </p>
            ) : (
              <div className="relative border-l border-[#2A2A2A] ml-3 space-y-8">
                {equipment.assignments?.map(
                  (assignment: {
                    id: string;
                    assignedTo?: { name: string };
                    checkedOutAt: string;
                    project?: { name: string };
                    checkedInAt?: string;
                    conditionOut: string;
                    conditionIn?: string;
                    notesOut?: string;
                    notesIn?: string;
                  }) => (
                    <div key={assignment.id} className="relative pl-6">
                      <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[#111111] border-2 border-[#A68B5B]" />
                      <div className="mb-2">
                        <span className="text-sm text-[#E1E1E1] font-medium">
                          {assignment.assignedTo?.name || "Unknown User"}
                        </span>
                        <span className="text-xs text-[#4A5568] ml-2">
                          {new Date(
                            assignment.checkedOutAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="bg-[#111111] border border-[#2A2A2A] p-4 text-sm">
                        <div className="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-[#2A2A2A]">
                          <div>
                            <span className="block text-[#4A5568] text-xs uppercase tracking-wider mb-1">
                              Project
                            </span>
                            <span className="text-[#E1E1E1]">
                              {assignment.project?.name ||
                                "Global / Unassigned"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[#4A5568] text-xs uppercase tracking-wider mb-1">
                              Status
                            </span>
                            {assignment.checkedInAt ? (
                              <span className="text-[#4A9079] flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Returned on{" "}
                                {new Date(
                                  assignment.checkedInAt,
                                ).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-[#A68B5B] flex items-center gap-1">
                                <Activity className="h-3 w-3" /> Currently
                                Assigned
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[#4A5568] text-xs uppercase tracking-wider mb-1">
                              Condition Out
                            </span>
                            <span className="text-[#E1E1E1] capitalize">
                              {assignment.conditionOut.replace("_", " ")}
                            </span>
                          </div>
                          {assignment.checkedInAt && (
                            <div>
                              <span className="block text-[#4A5568] text-xs uppercase tracking-wider mb-1">
                                Condition In
                              </span>
                              <span className="text-[#E1E1E1] capitalize">
                                {assignment.conditionIn?.replace("_", " ")}
                              </span>
                            </div>
                          )}
                        </div>
                        {(assignment.notesOut || assignment.notesIn) && (
                          <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                            <span className="block text-[#4A5568] text-xs uppercase tracking-wider mb-1">
                              Notes
                            </span>
                            <p className="text-[#A0AEC0]">
                              {assignment.notesOut &&
                                `Out: ${assignment.notesOut}`}
                              {assignment.notesOut &&
                                assignment.notesIn &&
                                " | "}
                              {assignment.notesIn &&
                                `In: ${assignment.notesIn}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h2 className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-4">
              Specs & Health
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-[#4A5568] block mb-1">
                  Current Condition
                </span>
                <span className="text-[#E1E1E1] capitalize">
                  {equipment.condition.replace("_", " ")}
                </span>
              </div>
              {equipment.serialNumber && (
                <div className="pt-3 border-t border-[#1A1A1A]">
                  <span className="text-[#4A5568] block mb-1">
                    Serial Number
                  </span>
                  <span className="text-[#E1E1E1] font-mono">
                    {equipment.serialNumber}
                  </span>
                </div>
              )}
              {equipment.meterReading !== null &&
                equipment.meterReading !== undefined && (
                  <div className="pt-3 border-t border-[#1A1A1A]">
                    <span className="text-[#4A5568] block mb-1">
                      Meter Reading
                    </span>
                    <span className="text-[#E1E1E1] font-mono">
                      {equipment.meterReading} {equipment.meterUnit || "units"}
                    </span>
                  </div>
                )}
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h2 className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-4">
              Financials & Dates
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#4A5568] flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Purchase Price
                </span>
                <span className="text-[#E1E1E1] font-mono">
                  {equipment.purchasePrice
                    ? `$${equipment.purchasePrice.toLocaleString()}`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-[#1A1A1A] pt-3">
                <span className="text-[#4A5568] flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Purchased
                </span>
                <span className="text-[#E1E1E1]">
                  {equipment.purchaseDate
                    ? new Date(equipment.purchaseDate).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-[#1A1A1A] pt-3">
                <span className="text-[#4A5568] flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Warranty Expiry
                </span>
                <span className="text-[#E1E1E1]">
                  {equipment.warrantyExpiry
                    ? new Date(equipment.warrantyExpiry).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 text-center">
            {equipment.maintenanceDue ? (
              <>
                <AlertCircle className="h-8 w-8 text-[#9E534F] mx-auto mb-3" />
                <h3 className="text-[#9E534F] font-medium uppercase tracking-wider mb-2">
                  Maintenance Overdue
                </h3>
                <p className="text-xs text-[#A0AEC0] mb-4">
                  This asset requires immediate servicing. Proceed with caution.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-8 w-8 text-[#4A9079] mx-auto mb-3" />
                <h3 className="text-[#4A9079] font-medium uppercase tracking-wider mb-2">
                  Asset Healthy
                </h3>
                <p className="text-xs text-[#A0AEC0] mb-4">
                  {equipment.nextMaintenanceDate
                    ? `Next service due: ${new Date(equipment.nextMaintenanceDate).toLocaleDateString()}`
                    : "No upcoming service scheduled."}
                </p>
              </>
            )}
            <button className="w-full py-2 border border-[#2A2A2A] text-[#E1E1E1] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#111111] transition-colors">
              Schedule Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
