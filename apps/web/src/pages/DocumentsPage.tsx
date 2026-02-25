import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Upload,
  ChevronRight,
  Search,
  Building2,
} from "lucide-react";
import { documentApi, projectsApi } from "@/lib/api";
import type { ProjectDocument } from "../../../../packages/shared/src/types";

// Local helper to format bytes
function formatFileSize(bytes?: number | null) {
  if (!bytes) return "--";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "blueprint":
      return <ImageIcon className="h-5 w-5 text-[#6B8EC4]" />;
    case "contract":
    case "invoice":
      return <FileText className="h-5 w-5 text-[#4A9079]" />;
    default:
      return <File className="h-5 w-5 text-[#4A5568]" />;
  }
};

export function DocumentsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentFolder, setCurrentFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string; name: string }[]
  >([]);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list().then((res) => res.data),
  });

  const { data: docsData, isLoading } = useQuery({
    queryKey: ["documents", selectedProjectId, currentFolder?.id],
    queryFn: () =>
      documentApi
        .list(selectedProjectId, currentFolder?.id)
        .then((res) => res.data),
    enabled: !!selectedProjectId,
  });

  const projects = projectsData?.data?.items || [];
  const documents: ProjectDocument[] = docsData?.data || [];

  const handleNavigateToFolder = (folder: ProjectDocument) => {
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    setCurrentFolder({ id: folder.id, name: folder.name });
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setBreadcrumbs([]);
      setCurrentFolder(null);
    } else {
      const target = breadcrumbs[index];
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      setCurrentFolder(target);
    }
  };

  // Dummy funcs for demo UI
  const handleUpload = () => {
    alert("File upload modal would open here");
  };

  const handleNewFolder = () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    documentApi
      .create({
        projectId: selectedProjectId,
        folderId: currentFolder?.id || null,
        name,
        type: "folder",
      })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["documents", selectedProjectId, currentFolder?.id],
        });
      });
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 shrink-0">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            File Storage
          </p>
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Document Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#4A5568]" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setCurrentFolder(null);
                setBreadcrumbs([]);
              }}
              className="bg-transparent text-white text-sm focus:outline-none min-w-[200px]"
            >
              <option value="">-- Select Project --</option>
              {projects.map((p: { id: string; name: string }) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={!selectedProjectId}
            onClick={handleNewFolder}
            className="flex items-center gap-2 px-4 py-2 border border-[#1A1A1A] text-xs font-medium tracking-[0.1em] text-[#E1E1E1] uppercase hover:bg-white/[0.02] transition-colors disabled:opacity-50"
          >
            <Folder className="h-4 w-4" />
            New Folder
          </button>
          <button
            disabled={!selectedProjectId}
            onClick={handleUpload}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#A68B5B] text-[#0A0A0A] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#8A7048] transition-colors shadow-lg shadow-[#A68B5B]/20 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
            Upload File
          </button>
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="flex-1 bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col items-center justify-center p-12 text-center mt-4">
          <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="h-8 w-8 text-[#4A5568]" strokeWidth={1} />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">
            No Project Selected
          </h3>
          <p className="text-[#4A5568] max-w-sm">
            Select a project from the dropdown menu to view and manage its
            documents.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden">
          {/* Toolbar and Breadcrumbs */}
          <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-[#1A1A1A] gap-4">
            <div className="flex items-center gap-2 text-sm text-[#E1E1E1] overflow-x-auto whitespace-nowrap pb-2 md:pb-0">
              <button
                onClick={() => handleNavigateToBreadcrumb(-1)}
                className="hover:text-[#A68B5B] transition-colors flex items-center gap-1.5"
              >
                <FolderOpen className="h-4 w-4 text-[#A68B5B]" />
                Root
              </button>
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-[#4A5568]" />
                  <button
                    onClick={() => handleNavigateToBreadcrumb(idx)}
                    className={`${idx === breadcrumbs.length - 1 ? "text-white font-medium" : "hover:text-[#A68B5B] transition-colors"}`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#111111] border border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors"
              />
            </div>
          </div>

          {/* File Grid / List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A68B5B] border-t-transparent" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <File
                  className="h-12 w-12 text-[#2A2A2A] mb-4"
                  strokeWidth={1}
                />
                <p className="text-white font-medium">This folder is empty</p>
                <p className="text-sm text-[#4A5568] mt-1">
                  Upload a file or create a subfolder.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Render Folders First */}
                {filteredDocs
                  .filter((d) => d.type === "folder")
                  .map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => handleNavigateToFolder(folder)}
                      className="flex items-center justify-between p-4 bg-[#111111] border border-[#1A1A1A] rounded hover:border-[#A68B5B] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Folder className="h-6 w-6 text-[#A68B5B] shrink-0 fill-[#A68B5B]/10" />
                        <span className="text-sm font-medium text-[#E1E1E1] truncate group-hover:text-white transition-colors">
                          {folder.name}
                        </span>
                      </div>
                      <button className="p-1 text-[#4A5568] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                {/* Render Files */}
                {filteredDocs
                  .filter((d) => d.type !== "folder")
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col p-4 bg-[#111111] border border-[#1A1A1A] rounded hover:border-[#3A3A3A] transition-colors group relative"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-[#1A1A1A] rounded shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <button className="p-1 text-[#4A5568] hover:text-white transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <h4
                          className="text-sm font-medium text-[#E1E1E1] truncate group-hover:text-white transition-colors mb-1"
                          title={file.name}
                        >
                          {file.name}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-[#4A5568]">
                          <span className="uppercase tracking-wide">
                            {file.type}
                          </span>
                          <span>{formatFileSize(file.sizeBytes)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
