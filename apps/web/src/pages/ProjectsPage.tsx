import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Filter, ArrowUpRight, FolderKanban } from "lucide-react";
import { projectsApi } from "@/lib/api";
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

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  description?: string;
  location?: string;
  city?: string;
  projectType?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  progress?: number;
  _count?: { tasks: number; members: number };
}

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-[#4A5568]/20 text-[#718096]",
  active: "bg-[#A68B5B]/20 text-[#A68B5B]",
  on_hold: "bg-[#9E534F]/20 text-[#D4796E]",
  completed: "bg-[#4A9079]/20 text-[#4A9079]",
  cancelled: "bg-[#9E534F]/20 text-[#9E534F]",
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES.planning;
}

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(
    searchParams.get("create") === "true",
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreate(true);
      searchParams.delete("create");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", search],
    queryFn: () => projectsApi.list({ search }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "project"] });
      setShowCreate(false);
    },
  });

  const projects = data?.data?.data?.items || [];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            Portfolio
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-[#4A5568] mt-1">
            Manage your construction projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors duration-300"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Project
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors duration-300"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-[#1A1A1A] text-[#4A5568] text-sm hover:bg-white/[0.03] hover:border-[#2A2A2A] transition-all duration-300">
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-[#4A5568]">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A]">
          <FolderKanban
            className="h-12 w-12 text-[#2A2A2A] mx-auto mb-4"
            strokeWidth={1}
          />
          <h3 className="text-white font-medium mb-2">No projects found</h3>
          <p className="text-[#4A5568] text-sm">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: ProjectItem) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group bg-[#0A0A0A] border border-[#1A1A1A] p-6 hover:border-[#2A2A2A] transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-4">
                <span
                  className={`px-3 py-1 text-xs font-medium tracking-wide uppercase ${getStatusStyle(project.status)}`}
                >
                  {project.status}
                </span>
                <ArrowUpRight className="w-4 h-4 text-[#3A3A3A] group-hover:text-[#A68B5B] transition-colors duration-300" />
              </div>
              <h3 className="text-base font-medium text-white mb-2 group-hover:text-[#A68B5B] transition-colors duration-300">
                {project.name}
              </h3>
              <p className="text-sm text-[#4A5568] line-clamp-2">
                {project.description || "No description"}
              </p>
              <div className="mt-4 pt-4 border-t border-[#1A1A1A] flex items-center justify-between text-xs text-[#4A5568]">
                <span>{project.city || "No location"}</span>
                <span className="tracking-wide uppercase">
                  {project.projectType || "General"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#1A1A1A] w-full max-w-md p-6">
            <h2 className="text-lg font-medium text-white mb-1">
              Create Project
            </h2>
            <p className="text-xs text-[#4A5568] mb-6">
              Add a new construction project to your portfolio
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate(
                  sanitizeFormData({
                    name: formData.get("name"),
                    description: formData.get("description"),
                    projectType: formData.get("projectType"),
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
                    "Failed to create project"}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Name
                  </label>
                  <input
                    name="name"
                    required
                    className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-transparent border border-[#1A1A1A] text-white text-sm placeholder:text-[#4A5568] focus:outline-none focus:border-[#A68B5B]/50 transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E1E1E1] tracking-wide uppercase mb-2">
                    Type
                  </label>
                  <select
                    name="projectType"
                    className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#A68B5B]/50 transition-colors"
                  >
                    <option value="">Select type</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="renovation">Renovation</option>
                    <option value="land_development">Land Development</option>
                  </select>
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
                  {createMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
