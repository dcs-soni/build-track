import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
  restoreAuth: (user: User, tenantId?: string) => void;
  updateTokens: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => void;
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
      restoreAuth: (user, tenantId) =>
        set((state) => ({
          user,
          isAuthenticated: !!state.accessToken,
          isLoading: false,
          currentTenantId: tenantId || state.currentTenantId || null,
        })),
      updateTokens: (tokens) =>
        set((state) => ({
          accessToken: tokens.accessToken,
          refreshToken:
            tokens.refreshToken === undefined
              ? state.refreshToken
              : tokens.refreshToken,
          isAuthenticated: true,
        })),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          currentTenantId: null,
        }),
    }),
    {
      name: "buildtrack-auth",
      storage: createJSONStorage(() => sessionStorage),
      // accessToken (short-lived JWT) and currentTenantId are persisted to
      // sessionStorage so sessions survive reloads in the active tab without
      // leaving tokens behind across browser restarts. refreshToken and user
      // PII are NOT persisted.
      partialize: (state) => ({
        accessToken: state.accessToken,
        currentTenantId: state.currentTenantId,
      }),
      // On hydration, validate the token is not expired
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (
          state.accessToken &&
          !isTokenExpired(state.accessToken)
        ) {
          state.isAuthenticated = true;
          state.isLoading = false;
        } else {
          state.logout();
        }
      },
    },
  ),
);
