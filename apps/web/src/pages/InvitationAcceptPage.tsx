import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

type InvitationPreview = {
  email: string;
  role: string;
  tenantName: string;
  invitedBy: string;
  expiresAt: string;
};

type AcceptInvitationResponse = {
  user: {
    id: string;
    email: string;
    name: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  tenantId: string;
};

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as
    | T
    | { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(
      (payload as { error?: { message?: string } }).error?.message ||
        "Request failed",
    );
  }

  return payload as T;
}

export function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const invitationQuery = useQuery({
    queryKey: ["invitation-preview", token],
    enabled: !!token,
    queryFn: async () => {
      const response = await readJson<{
        data: InvitationPreview;
      }>(`/api/v1/invitations/validate/${token}`);
      return response.data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const body =
        name.trim() || password
          ? JSON.stringify({ name: name.trim(), password })
          : undefined;

      const response = await readJson<{
        data: AcceptInvitationResponse;
      }>(`/api/v1/invitations/accept/${token}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });

      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.tokens, data.tenantId);
      navigate("/dashboard", { replace: true });
    },
  });

  const invitation = invitationQuery.data;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="w-full max-w-xl border border-[#1A1A1A] bg-[#111111] p-8 md:p-10">
        <p className="text-xs tracking-[0.3em] text-[#A68B5B] uppercase mb-3">
          Invitation
        </p>
        <h1 className="text-3xl text-white tracking-tight mb-3">
          Join {invitation?.tenantName || "BuildTrack"}
        </h1>
        <p className="text-sm text-[#718096]">
          Accept your workspace invitation and continue into the project portal.
        </p>

        {invitationQuery.isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#A68B5B]" />
          </div>
        ) : invitationQuery.isError || !invitation ? (
          <div className="mt-8 border border-[#9E534F]/30 bg-[#9E534F]/10 p-5">
            <p className="text-sm text-[#D4796E]">
              {(invitationQuery.error as Error | null)?.message ||
                "This invitation is invalid or has expired."}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-4 text-sm text-[#A68B5B] hover:text-white transition-colors"
            >
              Return to login <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 border border-[#1A1A1A] bg-[#0A0A0A] p-5">
              <DetailRow label="Email" value={invitation.email} />
              <DetailRow label="Role" value={invitation.role} />
              <DetailRow label="Invited By" value={invitation.invitedBy} />
              <DetailRow
                label="Expires"
                value={new Date(invitation.expiresAt).toLocaleString()}
              />
            </div>

            <div className="mt-8 space-y-5">
              <div>
                <label className="block text-xs tracking-[0.2em] text-[#718096] uppercase mb-2">
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Only required if this is your first login"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs tracking-[0.2em] text-[#718096] uppercase mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Only required if you need a new account"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
                />
              </div>

              <p className="text-xs text-[#4A5568]">
                Existing users can accept directly. New users must provide a
                name and password.
              </p>

              {acceptMutation.isError && (
                <div className="border border-[#9E534F]/30 bg-[#9E534F]/10 p-4 text-sm text-[#D4796E]">
                  {(acceptMutation.error as Error).message}
                </div>
              )}

              <button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#A68B5B] text-[#0A0A0A] text-sm font-medium uppercase tracking-[0.15em] hover:bg-[#B89C6C] transition-colors disabled:opacity-50"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    Accept Invitation
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs tracking-[0.15em] text-[#4A5568] uppercase">
        {label}
      </span>
      <span className="text-sm text-white text-right">{value}</span>
    </div>
  );
}
