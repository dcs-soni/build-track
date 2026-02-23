import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
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
      // accessToken (short-lived JWT) and currentTenantId are persisted to
      // localStorage so sessions survive page reloads. refreshToken and user
      // PII are NOT persisted. Note: storing JWTs in localStorage exposes them
      // to XSS; the short expiry (15 min) limits the window of risk.
      partialize: (state) => ({
        accessToken: state.accessToken,
        currentTenantId: state.currentTenantId,
      }),
      // On hydration, validate the token is not expired
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (
          state.accessToken &&
          !isTokenExpired(state.accessToken) &&
          state.currentTenantId
        ) {
          state.isAuthenticated = true;
        } else {
          state.logout();
        }
      },
    },
  ),
);
