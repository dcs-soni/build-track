import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { rfiApi } from "@/lib/api";
import { RFI } from "@buildtrack/shared";
import {
  FileQuestion,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

export function RFIPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery<{ success: boolean; data: RFI[] }>({
    queryKey: ["rfis", projectId, filter],
    queryFn: () =>
      rfiApi
        .listByProject(projectId!, filter !== "all" ? { status: filter } : {})
        .then((res) => res.data),
    enabled: !!projectId,
  });

  const rfis = data?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
      case "under_review":
        return "text-[#6B8EC4] bg-[#6B8EC4]/10 border-[#6B8EC4]/20";
      case "answered":
      case "closed":
        return "text-[#4A9079] bg-[#4A9079]/10 border-[#4A9079]/20";
      case "draft":
        return "text-[#4A5568] bg-[#111111] border-[#2A2A2A]";
      case "void":
        return "text-[#9E534F] bg-[#9E534F]/10 border-[#9E534F]/20";
      default:
        return "text-gray-400 bg-gray-900 border-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Project Tracking
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight flex items-center gap-3">
            <FileQuestion className="h-6 w-6 text-[#A68B5B]" />
            RFIs
          </h1>
          <p className="text-sm text-[#4A5568] mt-1">
            Requests for Information, sorted by due date
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors duration-300">
          <Plus className="h-4 w-4" />
          Create RFI
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          {["all", "open", "under_review", "answered", "closed"].map((f) => (
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
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
          <input
            type="text"
            placeholder="Search RFIs..."
            className="w-full pl-9 pr-4 py-2 bg-[#111111] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] transition-colors placeholder-[#4A5568] text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A]">
        {isLoading ? (
          <div className="p-8 text-center text-[#4A5568]">Loading RFIs...</div>
        ) : rfis.length === 0 ? (
          <div className="p-12 text-center text-[#4A5568]">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No RFIs found matching your criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1A1A1A]">
            {rfis.map((rfi) => (
              <div
                key={rfi.id}
                className="p-4 hover:bg-[#111111] transition-colors duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 border ${getStatusColor(
                      rfi.status,
                    )} rounded-none min-w-[48px] flex justify-center`}
                  >
                    {rfi.status === "closed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : rfi.isOverdue ? (
                      <AlertCircle className="h-5 w-5 text-[#9E534F]" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[#A68B5B] font-mono text-xs">
                        {rfi.rfiNumber}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 border uppercase tracking-wider ${getStatusColor(
                          rfi.status,
                        )}`}
                      >
                        {rfi.status.replace("_", " ")}
                      </span>
                      {rfi.isOverdue && (
                        <span className="text-xs text-[#9E534F] bg-[#9E534F]/10 px-2 py-0.5 border border-[#9E534F]/20 uppercase tracking-wider">
                          Overdue ({Math.abs(rfi.daysUntilDue || 0)}d)
                        </span>
                      )}
                    </div>
                    <h3 className="text-[#E1E1E1] font-medium text-lg leading-snug">
                      {rfi.subject}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#4A5568]">
                      <span className="flex items-center gap-1">
                        <span className="uppercase text-[10px] tracking-wider">
                          Ball in Court:
                        </span>
                        <span className="text-white capitalize">
                          {rfi.ballInCourt}
                        </span>
                      </span>
                      {rfi._count?.responses !== undefined && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {rfi._count.responses}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-[#4A5568] uppercase tracking-wider mb-1">
                      Due Date
                    </p>
                    <p
                      className={`text-sm ${
                        rfi.isOverdue ? "text-[#9E534F]" : "text-[#E1E1E1]"
                      }`}
                    >
                      {new Date(rfi.dateRequired).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/projects/${projectId}/rfis/${rfi.id}`}
                    className="p-2 border border-[#2A2A2A] text-[#4A5568] hover:text-[#A68B5B] hover:border-[#A68B5B] transition-all"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
