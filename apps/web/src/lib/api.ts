import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";

export const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const { accessToken, currentTenantId } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (currentTenantId) config.headers["X-Tenant-ID"] = currentTenantId;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { refreshToken, logout } = useAuthStore.getState();
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post("/api/v1/auth/refresh", {
            refreshToken,
          });
          useAuthStore.getState().setAuth(useAuthStore.getState().user!, {
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          });
          error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(error.config);
        } catch {
          logout();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: {
    email: string;
    password: string;
    name: string;
    tenantName?: string;
  }) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
};

// Projects API
export const projectsApi = {
  list: (params?: Record<string, string>) => api.get("/projects", { params }),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: Record<string, unknown>) => api.post("/projects", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  dashboard: (id: string) => api.get(`/projects/${id}/dashboard`),
};

// Tasks API
export const tasksApi = {
  create: (data: Record<string, unknown>) => api.post("/tasks", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  complete: (id: string) => api.post(`/tasks/${id}/complete`),
};

// Notifications API
export const notificationsApi = {
  list: (params?: Record<string, string>) =>
    api.get("/notifications", { params }),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
  preferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data: Record<string, unknown>) =>
    api.put("/notifications/preferences", data),
};

// Project Updates API
export const projectUpdatesApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get(`/projects/${projectId}/updates`, { params }),
  create: (projectId: string, data: Record<string, unknown>) =>
    api.post(`/projects/${projectId}/updates`, data),
};

// RFI (Request for Information) API
export const rfiApi = {
  listByProject: (projectId: string, params?: Record<string, string>) =>
    api.get(`/rfis/projects/${projectId}`, { params }),
  get: (id: string) => api.get(`/rfis/${id}`),
  create: (data: Record<string, unknown>) => api.post("/rfis", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/rfis/${id}`, data),
  submit: (id: string) => api.post(`/rfis/${id}/submit`),
  respond: (id: string, data: { response: string; isOfficial?: boolean }) =>
    api.post(`/rfis/${id}/respond`, data),
  close: (id: string, data?: { officialAnswer?: string }) =>
    api.post(`/rfis/${id}/close`, data || {}),
  voidRfi: (id: string) => api.post(`/rfis/${id}/void`),
  delete: (id: string) => api.delete(`/rfis/${id}`),
};

// Equipment API
export const equipmentApi = {
  list: (params?: Record<string, string>) => api.get("/equipment", { params }),
  get: (id: string) => api.get(`/equipment/${id}`),
  create: (data: Record<string, unknown>) => api.post("/equipment", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/equipment/${id}`, data),
  checkout: (id: string, data: Record<string, unknown>) =>
    api.post(`/equipment/${id}/checkout`, data),
  checkin: (id: string, data: Record<string, unknown>) =>
    api.post(`/equipment/${id}/checkin`, data),
  history: (id: string) => api.get(`/equipment/${id}/history`),
};

// Expense API
export const expenseApi = {
  list: (params?: Record<string, string>) => api.get("/expenses", { params }),
  get: (id: string) => api.get(`/expenses/${id}`),
  create: (data: Record<string, unknown>) => api.post("/expenses", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  approve: (id: string) => api.post(`/expenses/${id}/approve`),
  reject: (id: string) => api.post(`/expenses/${id}/reject`),
  uploadReceipt: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/expenses/${id}/receipt`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Document Management API
export const documentApi = {
  list: (projectId: string, folderId?: string) =>
    api.get(`/documents/projects/${projectId}`, { params: { folderId } }),
  get: (id: string) => api.get(`/documents/${id}`),
  create: (data: Record<string, unknown>) => api.post("/documents", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// Inspection API
export const inspectionApi = {
  listByProject: (projectId: string, params?: Record<string, string>) =>
    api.get(`/inspections/projects/${projectId}`, { params }),
  get: (id: string) => api.get(`/inspections/${id}`),
  create: (data: Record<string, unknown>) => api.post("/inspections", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/inspections/${id}`, data),
  complete: (id: string, data: Record<string, unknown>) =>
    api.post(`/inspections/${id}/complete`, data),
  delete: (id: string) => api.delete(`/inspections/${id}`),
};

// Punch List API
export const punchListApi = {
  listByProject: (projectId: string, params?: Record<string, string>) =>
    api.get(`/punch-list/projects/${projectId}`, { params }),
  get: (id: string) => api.get(`/punch-list/${id}`),
  create: (data: Record<string, unknown>) => api.post("/punch-list", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/punch-list/${id}`, data),
  resolve: (id: string, data: { resolution: string }) =>
    api.post(`/punch-list/${id}/resolve`, data),
  verify: (id: string) => api.post(`/punch-list/${id}/verify`),
  delete: (id: string) => api.delete(`/punch-list/${id}`),
};

// Safety Incident API
export const safetyIncidentApi = {
  list: (params?: Record<string, string>) =>
    api.get("/safety-incidents", { params }),
  listByProject: (projectId: string, params?: Record<string, string>) =>
    api.get(`/safety-incidents/projects/${projectId}`, { params }),
  get: (id: string) => api.get(`/safety-incidents/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post("/safety-incidents", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/safety-incidents/${id}`, data),
  investigate: (id: string) => api.post(`/safety-incidents/${id}/investigate`),
  resolve: (id: string, data: Record<string, unknown>) =>
    api.post(`/safety-incidents/${id}/resolve`, data),
  delete: (id: string) => api.delete(`/safety-incidents/${id}`),
};

// Change Order API
export const changeOrderApi = {
  listByProject: (projectId: string, params?: Record<string, string>) =>
    api.get(`/change-orders/projects/${projectId}`, { params }),
  get: (id: string) => api.get(`/change-orders/${id}`),
  create: (data: Record<string, unknown>) => api.post("/change-orders", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/change-orders/${id}`, data),
  submit: (id: string) => api.post(`/change-orders/${id}/submit`),
  approve: (id: string, data?: { approvedCost?: number }) =>
    api.post(`/change-orders/${id}/approve`, data || {}),
  reject: (id: string, data: { reason: string }) =>
    api.post(`/change-orders/${id}/reject`, data),
  addItem: (id: string, data: Record<string, unknown>) =>
    api.post(`/change-orders/${id}/items`, data),
  removeItem: (id: string, itemId: string) =>
    api.delete(`/change-orders/${id}/items/${itemId}`),
  delete: (id: string) => api.delete(`/change-orders/${id}`),
};

// Progress Report API
export const progressReportApi = {
  weekly: (projectId: string, params?: Record<string, string>) =>
    api.get(`/reports/projects/${projectId}/weekly`, { params }),
  monthly: (projectId: string, params?: Record<string, string>) =>
    api.get(`/reports/projects/${projectId}/monthly`, { params }),
};
