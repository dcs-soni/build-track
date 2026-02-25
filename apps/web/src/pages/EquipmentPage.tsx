import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { equipmentApi } from "@/lib/api";
import type { Equipment } from "../../../../packages/shared/src/types";
import {
  Wrench,
  Search,
  Plus,
  ArrowRight,
  Truck,
  Shield,
  Laptop,
  Box,
  AlertCircle,
  HardHat,
} from "lucide-react";

export function EquipmentPage() {
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data, isLoading } = useQuery<{ success: boolean; data: Equipment[] }>(
    {
      queryKey: ["equipment", filter, categoryFilter],
      queryFn: () => {
        const params: Record<string, string> = {};
        if (filter !== "all") params.status = filter;
        if (categoryFilter !== "all") params.category = categoryFilter;
        return equipmentApi.list(params).then((res) => res.data);
      },
    },
  );

  const equipmentList = data?.data || [];

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
        return <Wrench className="h-5 w-5" />;
      case "vehicle":
      case "heavy_equipment":
        return <Truck className="h-5 w-5" />;
      case "safety":
        return <Shield className="h-5 w-5" />;
      case "electronics":
        return <Laptop className="h-5 w-5" />;
      default:
        return <Box className="h-5 w-5" />;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "poor":
      case "needs_repair":
        return "text-[#9E534F]";
      case "fair":
        return "text-[#A68B5B]";
      default:
        return "text-[#4A5568]";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Company Resources
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight flex items-center gap-3">
            <HardHat className="h-6 w-6 text-[#A68B5B]" />
            Equipment & Assets
          </h1>
          <p className="text-sm text-[#4A5568] mt-1">
            Track tools, vehicles, and heavy machinery
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors duration-300">
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-wrap gap-2">
          {["all", "available", "checked_out", "maintenance"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs tracking-wide uppercase transition-colors duration-300 ${
                filter === f
                  ? "bg-[#A68B5B] text-[#0A0A0A] font-medium"
                  : "bg-[#0A0A0A] border border-[#1A1A1A] text-[#4A5568] hover:text-[#E1E1E1] hover:border-[#2A2A2A]"
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
          <div className="h-6 w-px bg-[#1A1A1A] mx-2 self-center hidden sm:block" />
          {["tool", "vehicle", "electronics"].map((f) => (
            <button
              key={f}
              onClick={() =>
                setCategoryFilter(f === categoryFilter ? "all" : f)
              }
              className={`px-4 py-1.5 text-xs tracking-wide uppercase transition-colors duration-300 hidden sm:block ${
                categoryFilter === f
                  ? "bg-[#3A3A3A] text-white font-medium"
                  : "bg-[#0A0A0A] border border-[#1A1A1A] text-[#4A5568] hover:text-[#E1E1E1] hover:border-[#2A2A2A]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full pl-9 pr-4 py-2 bg-[#111111] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] transition-colors placeholder-[#4A5568] text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-[#4A5568]">Loading assets...</div>
      ) : equipmentList.length === 0 ? (
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-12 text-center text-[#4A5568]">
          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No equipment found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {equipmentList.map((item) => (
            <Link
              key={item.id}
              to={`/equipment/${item.id}`}
              className="bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#2A2A2A] transition-colors group flex flex-col"
            >
              <div className="p-5 border-b border-[#1A1A1A] flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 border border-[#1A1A1A] bg-[#111111] text-[#A68B5B]">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <h3 className="font-medium text-[#E1E1E1] group-hover:text-[#A68B5B] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#4A5568] font-mono mt-0.5">
                      {item.assetTag}
                    </p>
                  </div>
                </div>
                <div
                  className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider ${getStatusColor(
                    item.status,
                  )}`}
                >
                  {item.status.replace("_", " ")}
                </div>
              </div>

              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-[#4A5568] uppercase tracking-wider block mb-1">
                      Current Project
                    </span>
                    <span className="text-[#E1E1E1] truncate block">
                      {item.currentProject?.name || "Global / Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#4A5568] uppercase tracking-wider block mb-1">
                      Condition
                    </span>
                    <span
                      className={`capitalize truncate block ${getConditionColor(
                        item.condition,
                      )}`}
                    >
                      {item.condition.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {item.maintenanceDue && (
                  <div className="p-3 bg-[#9E534F]/5 border border-[#9E534F]/20 flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-[#9E534F]" />
                    <span className="text-xs text-[#9E534F]">
                      Maintenance Due
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#1A1A1A] bg-[#111111] flex justify-between items-center mt-auto">
                <div className="text-xs text-[#4A5568]">
                  {item.totalAssignments} Checkouts •{" "}
                  {item.totalMaintenanceRecords} Services
                </div>
                <ArrowRight className="h-4 w-4 text-[#4A5568] group-hover:text-[#A68B5B] transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
