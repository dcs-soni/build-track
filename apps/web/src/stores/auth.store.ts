import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentTenantId: string | null;
  setAuth: (
    user: User,
    tokens: { accessToken: string; refreshToken: string },
    tenantId?: string,
  ) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

/** Decode JWT payload and check if it's expired */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return !payload.exp || payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      currentTenantId: null,
      setAuth: (user, tokens, tenantId) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          currentTenantId: tenantId || null,
        }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          currentTenantId: null,
        }),
    }),
    {
      name: "buildtrack-auth",
      // Only persist non-sensitive data — tokens in memory, not localStorage.
      // accessToken is short-lived and needed for SPA API calls.
      // refreshToken and user PII are NOT persisted.
      partialize: (state) => ({
        accessToken: state.accessToken,
        currentTenantId: state.currentTenantId,
      }),
      // On hydration, validate the token is not expired
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && isTokenExpired(state.accessToken)) {
          state.accessToken = null;
          state.isAuthenticated = false;
          state.user = null;
        }
      },
    },
  ),
);
