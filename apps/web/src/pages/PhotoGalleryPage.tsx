import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Image, Grid, List, X } from "lucide-react";
import { api } from "@/lib/api";

interface PhotoItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  category?: string;
  createdAt?: string;
  takenAt?: string;
  uploadedBy?: { name: string };
}

interface CategoryStat {
  category: string;
  count: number;
}

const categoryColors: Record<string, string> = {
  progress: "bg-blue-100 text-blue-700",
  issue: "bg-red-100 text-red-700",
  safety: "bg-amber-100 text-amber-700",
  completion: "bg-green-100 text-green-700",
  before: "bg-gray-100 text-gray-700",
  after: "bg-purple-100 text-purple-700",
  general: "bg-gray-100 text-gray-700",
};

export function PhotoGalleryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["photos", projectId, selectedCategory],
    queryFn: () =>
      api.get(`/photos/projects/${projectId}`, {
        params: { category: selectedCategory || undefined },
      }),
    enabled: !!projectId,
  });

  const { data: statsData } = useQuery({
    queryKey: ["photo-stats", projectId],
    queryFn: () => api.get(`/photos/projects/${projectId}/stats`),
    enabled: !!projectId,
  });

  const photos = data?.data?.data?.items || [];
  const stats = statsData?.data?.data || { total: 0, byCategory: [] };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Photo Gallery</h2>
          <p className="text-sm text-gray-500">{stats.total} photos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory("")}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${!selectedCategory ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          All ({stats.total})
        </button>
        {stats.byCategory.map((cat: CategoryStat) => (
          <button
            key={cat.category}
            onClick={() => setSelectedCategory(cat.category)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${selectedCategory === cat.category ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} (
            {cat.count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Image className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900">No photos yet</h3>
          <p className="text-gray-500">
            Upload photos to document project progress.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {photos.map((photo: PhotoItem) => (
            <div
              key={photo.id}
              className="relative group cursor-pointer rounded-xl overflow-hidden bg-gray-100 aspect-square"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.thumbnailUrl || photo.url}
                alt={photo.caption || ""}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2">
                  {photo.category && (
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${categoryColors[photo.category] || categoryColors.general}`}
                    >
                      {photo.category}
                    </span>
                  )}
                  {photo.caption && (
                    <p className="text-white text-sm mt-1 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {photos.map((photo: PhotoItem) => (
            <div
              key={photo.id}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.thumbnailUrl || photo.url}
                alt=""
                className="h-16 w-16 object-cover rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {photo.caption || "Untitled"}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(
                    photo.takenAt ?? photo.createdAt ?? "",
                  ).toLocaleDateString()}
                </p>
              </div>
              {photo.category && (
                <span
                  className={`px-3 py-1 rounded-full text-xs ${categoryColors[photo.category] || categoryColors.general}`}
                >
                  {photo.category}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-center text-white">
              {selectedPhoto.category && (
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm mb-2 ${categoryColors[selectedPhoto.category]}`}
                >
                  {selectedPhoto.category}
                </span>
              )}
              {selectedPhoto.caption && (
                <p className="text-lg">{selectedPhoto.caption}</p>
              )}
              <p className="text-gray-400 text-sm mt-1">
                {new Date(
                  selectedPhoto.takenAt ?? selectedPhoto.createdAt ?? "",
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
