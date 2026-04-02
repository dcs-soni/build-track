import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, MapPin, Camera, FileText, CheckCircle2 } from "lucide-react";
import { formatDate } from "@buildtrack/shared";

type PortalOverview = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  city?: string | null;
  state?: string | null;
  startDate?: string | null;
  estimatedEnd?: string | null;
  coverImage?: string | null;
  tenant: {
    name: string;
    logoUrl?: string | null;
  };
};

type PortalProgress = {
  overallProgress: number;
  totalTasks: number;
  completedTasks: number;
  statusBreakdown: {
    pending: number;
    in_progress: number;
    completed: number;
  };
  milestones: Array<{
    title: string;
    dueDate?: string | null;
    status: string;
    progress?: number | null;
  }>;
};

type PortalPhoto = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  takenAt?: string | null;
};

type PortalUpdate = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author?: { name: string };
};

async function readJson<T>(input: string): Promise<T> {
  const response = await fetch(input);
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

export function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();

  const portalQuery = useQuery({
    queryKey: ["client-portal", token],
    enabled: !!token,
    queryFn: async () => {
      const [overview, progress, photos, updates] = await Promise.all([
        readJson<{ data: PortalOverview }>(`/api/v1/client/view/${token}`),
        readJson<{ data: PortalProgress }>(
          `/api/v1/client/view/${token}/progress`,
        ),
        readJson<{ data: PortalPhoto[] }>(
          `/api/v1/client/view/${token}/photos?limit=8`,
        ),
        readJson<{ data: PortalUpdate[] }>(
          `/api/v1/client/view/${token}/updates?limit=6`,
        ),
      ]);

      return {
        overview: overview.data,
        progress: progress.data,
        photos: photos.data,
        updates: updates.data,
      };
    },
  });

  if (portalQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#A68B5B]" />
      </div>
    );
  }

  if (portalQuery.isError || !portalQuery.data) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-lg border border-[#9E534F]/30 bg-[#111111] p-8 text-center">
          <p className="text-xs tracking-[0.3em] text-[#A68B5B] uppercase mb-3">
            Client Portal
          </p>
          <h1 className="text-2xl text-white mb-3">Access link unavailable</h1>
          <p className="text-sm text-[#718096]">
            {(portalQuery.error as Error | null)?.message ||
              "The project access link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { overview, progress, photos, updates } = portalQuery.data;

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#1E1B16]">
      <section className="relative overflow-hidden border-b border-[#D8CDBB] bg-[radial-gradient(circle_at_top_left,_rgba(166,139,91,0.18),_transparent_35%),linear-gradient(135deg,_#F6F0E4,_#EFE5D3)]">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <p className="text-xs tracking-[0.35em] text-[#8A7048] uppercase mb-4">
            {overview.tenant.name}
          </p>
          <div className="grid md:grid-cols-[1.3fr_0.7fr] gap-8 items-start">
            <div>
              <h1 className="text-4xl md:text-5xl tracking-tight leading-tight">
                {overview.name}
              </h1>
              <p className="mt-4 text-sm md:text-base text-[#5F5548] max-w-2xl">
                {overview.description || "Project updates, timeline progress, and milestone visibility."}
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-sm text-[#5F5548]">
                {(overview.city || overview.state) && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#8A7048]" />
                    {[overview.city, overview.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {overview.startDate && (
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#8A7048]" />
                    Started {formatDate(overview.startDate)}
                  </span>
                )}
                {overview.estimatedEnd && (
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#8A7048]" />
                    Estimated completion {formatDate(overview.estimatedEnd)}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-[#D8CDBB] bg-white/70 p-6 backdrop-blur-sm">
              <p className="text-xs tracking-[0.2em] text-[#8A7048] uppercase mb-2">
                Overall Progress
              </p>
              <div className="flex items-end justify-between gap-4">
                <span className="text-5xl font-medium">{progress.overallProgress}%</span>
                <span className="text-sm text-[#5F5548]">
                  {progress.completedTasks} of {progress.totalTasks} tasks complete
                </span>
              </div>
              <div className="mt-4 h-2 bg-[#E9DDC8] overflow-hidden">
                <div
                  className="h-full bg-[#A68B5B]"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <MetricTile label="Pending" value={progress.statusBreakdown.pending} />
                <MetricTile
                  label="Active"
                  value={progress.statusBreakdown.in_progress}
                />
                <MetricTile
                  label="Done"
                  value={progress.statusBreakdown.completed}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[1fr_0.9fr] gap-8">
        <section className="space-y-8">
          <div className="border border-[#D8CDBB] bg-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <FileText className="h-5 w-5 text-[#8A7048]" />
              <h2 className="text-xl tracking-tight">Latest Updates</h2>
            </div>
            {updates.length === 0 ? (
              <p className="text-sm text-[#6E6254]">
                No client-facing updates have been published yet.
              </p>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => (
                  <article
                    key={update.id}
                    className="border border-[#ECE3D6] bg-[#FCFAF6] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-base font-medium">{update.title}</h3>
                      <span className="text-xs uppercase tracking-[0.15em] text-[#8A7048]">
                        {new Date(update.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5F5548]">
                      {update.body}
                    </p>
                    <p className="mt-3 text-xs text-[#8A7D6B]">
                      Shared by {update.author?.name || "Project Team"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="border border-[#D8CDBB] bg-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <Camera className="h-5 w-5 text-[#8A7048]" />
              <h2 className="text-xl tracking-tight">Recent Photos</h2>
            </div>
            {photos.length === 0 ? (
              <p className="text-sm text-[#6E6254]">
                No project photos are available yet.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {photos.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden border border-[#ECE3D6] bg-[#FCFAF6]">
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || "Project update photo"}
                      className="h-52 w-full object-cover"
                    />
                    <figcaption className="p-3">
                      <p className="text-sm text-[#3D352C]">
                        {photo.caption || "Project progress"}
                      </p>
                      {photo.takenAt && (
                        <p className="mt-1 text-xs text-[#8A7D6B]">
                          {formatDate(photo.takenAt)}
                        </p>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="border border-[#D8CDBB] bg-white p-6 h-fit">
          <p className="text-xs tracking-[0.2em] text-[#8A7048] uppercase mb-4">
            Key Milestones
          </p>
          {progress.milestones.length === 0 ? (
            <p className="text-sm text-[#6E6254]">
              Milestones will appear here once the team schedules major tasks.
            </p>
          ) : (
            <div className="space-y-4">
              {progress.milestones.slice(0, 8).map((milestone) => (
                <div
                  key={`${milestone.title}-${milestone.dueDate || "na"}`}
                  className="border-l-2 border-[#A68B5B] pl-4"
                >
                  <p className="text-sm font-medium">{milestone.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.15em] text-[#8A7048]">
                    {milestone.status.replace("_", " ")}
                  </p>
                  <p className="mt-2 text-sm text-[#5F5548]">
                    {milestone.dueDate
                      ? formatDate(milestone.dueDate)
                      : "Date to be confirmed"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#E9DDC8] bg-[#FCFAF6] px-3 py-4">
      <p className="text-2xl font-medium">{value}</p>
      <p className="mt-1 text-[11px] tracking-[0.18em] text-[#8A7048] uppercase">
        {label}
      </p>
    </div>
  );
}
