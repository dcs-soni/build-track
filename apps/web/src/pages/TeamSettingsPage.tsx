import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Mail, Clock, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
  inviter?: { name: string };
}

export function TeamSettingsPage() {
  const [showInvite, setShowInvite] = useState(false);
  const queryClient = useQueryClient();

  const { data: invitationsData, isLoading } = useQuery({
    queryKey: ["invitations"],
    queryFn: () => api.get("/invitations"),
  });

  const createMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post("/invitations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setShowInvite(false);
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invitations/${id}/resend`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });

  const invitations = invitationsData?.data?.data || [];

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    member: "Team Member",
    viewer: "Viewer",
    client: "Client",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="mb-8">
        <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
          Administration
        </p>
        <h1 className="text-3xl font-medium text-white tracking-tight">
          Team Settings
        </h1>
        <p className="text-sm text-[#4A5568] mt-1">
          Manage team members and invitations
        </p>
      </div>

      {/* Invite Section */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 mb-6 leading-relaxed">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-white tracking-wide uppercase">
            Pending Invitations
          </h2>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors duration-300"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.5} />
            Invite Member
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-[#A68B5B] border-t-transparent animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12 border border-[#1A1A1A] bg-[#0A0A0A]">
            <Mail
              className="h-10 w-10 mx-auto mb-3 text-[#2A2A2A]"
              strokeWidth={1}
            />
            <p className="text-sm text-[#4A5568]">No pending invitations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv: InvitationItem) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#2A2A2A] transition-colors duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 border border-[#1A1A1A] bg-[#111111] flex items-center justify-center">
                    <Mail className="h-4 w-4 text-[#A68B5B]" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">
                      {inv.email}
                    </p>
                    <p className="text-xs text-[#4A5568] mt-0.5">
                      {roleLabels[inv.role] || inv.role} • Invited by{" "}
                      <span className="text-[#E1E1E1]">
                        {inv.inviter?.name || "Unknown"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-[#4A5568]">
                    <Clock className="h-3 w-3" />
                    Expires {new Date(inv.expiresAt ?? "").toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 border-l border-[#1A1A1A] pl-3 ml-1">
                    <button
                      onClick={() => resendMutation.mutate(inv.id)}
                      disabled={resendMutation.isPending}
                      className="p-2 text-[#4A5568] hover:text-[#A68B5B] transition-colors disabled:opacity-50"
                      title="Resend invitation"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${resendMutation.isPending ? "animate-spin" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(inv.id)}
                      className="p-2 text-[#4A5568] hover:text-[#9E534F] transition-colors disabled:opacity-50"
                      title="Cancel invitation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6">
        <h2 className="text-sm font-medium text-white mb-6 uppercase tracking-wide">
          Role Permissions
        </h2>
        <div className="grid gap-3">
          {[
            {
              role: "admin",
              desc: "Full access to all features, can manage team and billing",
            },
            {
              role: "manager",
              desc: "Can manage projects, view reports, and manage subcontractors",
            },
            {
              role: "member",
              desc: "Can create and edit tasks, submit daily reports",
            },
            { role: "viewer", desc: "Read-only access to project data" },
            {
              role: "client",
              desc: "Limited read-only access via client portal",
            },
          ].map((item) => (
            <div
              key={item.role}
              className="flex items-center gap-4 p-4 border border-[#1A1A1A] bg-[#111111]"
            >
              <div className="w-32 flex-shrink-0">
                <span className="inline-block px-2.5 py-1 bg-[#1A1A1A] text-[#A68B5B] text-[10px] tracking-widest uppercase font-medium">
                  {roleLabels[item.role]}
                </span>
              </div>
              <p className="text-[#888888] text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-xl font-medium text-white mb-6">
              Invite Team Member
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate({
                  email: formData.get("email") as string,
                  role: formData.get("role") as string,
                });
              }}
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-[#4A5568] uppercase tracking-wide mb-2">
                    Email Address *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] transition-colors placeholder-[#4A5568] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4A5568] uppercase tracking-wide mb-2">
                    Role *
                  </label>
                  <select
                    name="role"
                    required
                    className="w-full px-4 py-2.5 bg-[#111111] border border-[#2A2A2A] text-white focus:outline-none focus:border-[#A68B5B] transition-colors text-sm appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234A5568'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 1rem center",
                      backgroundSize: "1.2rem",
                    }}
                  >
                    <option value="" className="bg-[#111111]">
                      Select role
                    </option>
                    <option value="admin" className="bg-[#111111]">
                      Admin
                    </option>
                    <option value="manager" className="bg-[#111111]">
                      Manager
                    </option>
                    <option value="member" className="bg-[#111111]">
                      Team Member
                    </option>
                    <option value="viewer" className="bg-[#111111]">
                      Viewer
                    </option>
                    <option value="client" className="bg-[#111111]">
                      Client
                    </option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 py-2.5 border border-[#2A2A2A] text-[#E1E1E1] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#1A1A1A] transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
