import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { rfiApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import {
  ArrowLeft,
  FileQuestion,
  Clock,
  User,
  CheckCircle2,
  Send,
  MessageSquare,
} from "lucide-react";

export function RFIDetailPage() {
  const { projectId, rfiId } = useParams<{
    projectId: string;
    rfiId: string;
  }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [newResponse, setNewResponse] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rfi", rfiId],
    queryFn: () => rfiApi.get(rfiId!).then((res) => res.data),
    enabled: !!rfiId,
  });

  const respondMutation = useMutation({
    mutationFn: (data: { response: string; isOfficial: boolean }) =>
      rfiApi.respond(rfiId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfi", rfiId] });
      setNewResponse("");
      setIsOfficial(false);
    },
  });

  const rfi = data?.data;

  if (isLoading) {
    return <div className="p-8 text-[#4A5568]">Loading RFI details...</div>;
  }

  if (!rfi) {
    return <div className="p-8 text-[#9E534F]">RFI not found</div>;
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open":
      case "under_review":
        return "text-[#6B8EC4] border-[#6B8EC4]/20 bg-[#6B8EC4]/10";
      case "answered":
      case "closed":
        return "text-[#4A9079] border-[#4A9079]/20 bg-[#4A9079]/10";
      case "void":
        return "text-[#9E534F] border-[#9E534F]/20 bg-[#9E534F]/10";
      default:
        return "text-[#4A5568] border-[#2A2A2A] bg-[#111111]";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Back Link */}
      <div>
        <Link
          to={`/projects/${projectId}/rfis`}
          className="inline-flex items-center gap-2 text-xs text-[#4A5568] hover:text-[#A68B5B] uppercase tracking-widest transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to RFIs
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[#A68B5B] font-mono text-sm tracking-wider">
                {rfi.rfiNumber}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 border uppercase tracking-widest ${getStatusStyle(
                  rfi.status,
                )}`}
              >
                {rfi.status.replace("_", " ")}
              </span>
              {rfi.isOverdue && (
                <span className="text-[10px] px-2 py-0.5 border text-[#9E534F] bg-[#9E534F]/10 border-[#9E534F]/20 uppercase tracking-widest">
                  Overdue
                </span>
              )}
            </div>
            <h1 className="text-3xl font-medium text-white tracking-tight">
              {rfi.subject}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Card */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h2 className="text-sm font-medium text-[#E1E1E1] uppercase tracking-wider mb-4 border-b border-[#1A1A1A] pb-3 flex items-center gap-2">
              <FileQuestion className="h-4 w-4 text-[#A68B5B]" />
              Question Details
            </h2>
            <div className="prose prose-invert max-w-none prose-p:text-[#A0AEC0] prose-p:leading-relaxed">
              <p className="whitespace-pre-wrap">{rfi.question}</p>
            </div>
            {rfi.suggestedAnswer && (
              <div className="mt-6 pt-6 border-t border-[#1A1A1A]">
                <h3 className="text-xs text-[#4A5568] uppercase tracking-wider mb-2">
                  Suggested Answer / Recommendation
                </h3>
                <p className="text-[#E1E1E1] text-sm whitespace-pre-wrap">
                  {rfi.suggestedAnswer}
                </p>
              </div>
            )}
          </div>

          {/* Official Answer Card */}
          {rfi.officialAnswer && (
            <div className="bg-[#4A9079]/5 border border-[#4A9079]/20 p-6">
              <h2 className="text-sm font-medium text-[#4A9079] uppercase tracking-wider mb-4 border-b border-[#4A9079]/20 pb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Official Answer
              </h2>
              <div className="prose prose-invert max-w-none prose-p:text-[#E1E1E1]">
                <p className="whitespace-pre-wrap">{rfi.officialAnswer}</p>
              </div>
              <p className="text-xs text-[#4A9079] mt-4 flex items-center gap-2">
                <User className="h-3 w-3" />
                Answered by {rfi.answeredBy?.name || "Unknown"} on{" "}
                {new Date(rfi.dateAnswered!).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Response Thread */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h2 className="text-sm font-medium text-[#E1E1E1] uppercase tracking-wider mb-6 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#A68B5B]" />
              Discussion Thread
            </h2>

            <div className="space-y-6">
              {rfi.responses?.map(
                (resp: {
                  id: string;
                  responderId: string;
                  responder?: { name: string };
                  createdAt: string;
                  response: string;
                }) => (
                  <div
                    key={resp.id}
                    className={`flex gap-4 ${
                      resp.responderId === user?.id ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-[#A68B5B]" />
                    </div>
                    <div
                      className={`flex flex-col ${
                        resp.responderId === user?.id
                          ? "items-end"
                          : "items-start"
                      } max-w-[80%]`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[#A0AEC0]">
                          {resp.responder?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-[#4A5568]">
                          {new Date(resp.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div
                        className={`p-4 text-sm whitespace-pre-wrap ${
                          resp.responderId === user?.id
                            ? "bg-[#A68B5B] text-[#0A0A0A] rounded-l-xl rounded-br-xl"
                            : "bg-[#111111] border border-[#2A2A2A] text-[#E1E1E1] rounded-r-xl rounded-bl-xl"
                        }`}
                      >
                        {resp.response}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>

            {/* Reply Box */}
            {["open", "under_review"].includes(rfi.status) && (
              <div className="mt-8 pt-6 border-t border-[#1A1A1A]">
                <textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="Type your response..."
                  className="w-full min-h-[100px] p-4 bg-[#111111] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] transition-colors placeholder-[#4A5568] text-sm resize-none"
                />
                <div className="flex items-center justify-between mt-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isOfficial}
                        onChange={(e) => setIsOfficial(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-4 h-4 border border-[#4A5568] bg-[#0A0A0A] peer-checked:bg-[#A68B5B] peer-checked:border-[#A68B5B] transition-colors" />
                      <CheckCircle2 className="absolute w-3 h-3 text-[#0A0A0A] opacity-0 peer-checked:opacity-100 pointer-events-none" />
                    </div>
                    <span className="text-xs text-[#E1E1E1] group-hover:text-white transition-colors">
                      Mark as Official Answer (Closes RFI)
                    </span>
                  </label>
                  <button
                    onClick={() =>
                      respondMutation.mutate({
                        response: newResponse,
                        isOfficial,
                      })
                    }
                    disabled={!newResponse.trim() || respondMutation.isPending}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-[#E1E1E1] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    {respondMutation.isPending ? "Sending..." : "Send"}
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h2 className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-4">
              Details
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-[#4A5568] block mb-1">Due Date</span>
                <span className="text-[#E1E1E1] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#A68B5B]" />
                  {new Date(rfi.dateRequired).toLocaleDateString()}
                </span>
              </div>
              <div className="pt-3 border-t border-[#1A1A1A]">
                <span className="text-[#4A5568] block mb-1">Ball in Court</span>
                <span className="text-[#E1E1E1] capitalize">
                  {rfi.ballInCourt}
                </span>
              </div>
              <div className="pt-3 border-t border-[#1A1A1A]">
                <span className="text-[#4A5568] block mb-1">Assigned To</span>
                <span className="text-[#E1E1E1]">
                  {rfi.assignedTo?.name || "Unassigned"}
                </span>
              </div>
              <div className="pt-3 border-t border-[#1A1A1A]">
                <span className="text-[#4A5568] block mb-1">Created By</span>
                <span className="text-[#E1E1E1]">
                  {rfi.creator?.name || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
            <h2 className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-4">
              Impact Assessment
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#4A5568]">Cost Impact</span>
                <span
                  className={`font-medium ${
                    rfi.costImpact ? "text-[#9E534F]" : "text-[#4A9079]"
                  }`}
                >
                  {rfi.costImpact
                    ? rfi.costAmount
                      ? `$${rfi.costAmount}`
                      : "Yes (TBD)"
                    : "None"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-[#1A1A1A] pt-3">
                <span className="text-[#4A5568]">Schedule Impact</span>
                <span
                  className={`font-medium ${
                    rfi.scheduleImpact ? "text-[#9E534F]" : "text-[#4A9079]"
                  }`}
                >
                  {rfi.scheduleImpact
                    ? rfi.scheduleDays
                      ? `${rfi.scheduleDays} Days`
                      : "Yes (TBD)"
                    : "None"}
                </span>
              </div>
            </div>
          </div>

          {(rfi.drawingRef || rfi.specSection || rfi.location) && (
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
              <h2 className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-4">
                References
              </h2>
              <div className="space-y-3 text-sm">
                {rfi.drawingRef && (
                  <div className="flex justify-between">
                    <span className="text-[#4A5568]">Drawing</span>
                    <span className="text-[#E1E1E1] font-mono">
                      {rfi.drawingRef}
                    </span>
                  </div>
                )}
                {rfi.specSection && (
                  <div className="flex justify-between">
                    <span className="text-[#4A5568]">Spec Section</span>
                    <span className="text-[#E1E1E1] font-mono">
                      {rfi.specSection}
                    </span>
                  </div>
                )}
                {rfi.location && (
                  <div className="flex justify-between">
                    <span className="text-[#4A5568]">Location</span>
                    <span className="text-[#E1E1E1]">{rfi.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
