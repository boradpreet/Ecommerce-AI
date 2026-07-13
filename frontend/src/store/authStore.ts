import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AuthUser {
  id?: number;
  full_name?: string | null;
  email?: string | null;
  is_superuser?: boolean;
  has_completed_onboarding?: boolean;
}

export interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
  user: AuthUser | null;
  _hasHydrated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

// Mirror the session into cookies so the Next.js middleware (src/middleware.ts),
// which cannot read localStorage, can guard protected routes server-side.
// The backend still validates the real JWT on every API call.
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matches JWT lifetime

function syncAuthCookies(token: string | null, user?: AuthUser | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `voqly_session=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    if (user !== undefined && user !== null) {
      const role = user.is_superuser ? "admin" : "vendor";
      document.cookie = `voqly_role=${role}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  } else {
    document.cookie = "voqly_session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "voqly_role=; path=/; max-age=0; SameSite=Lax";
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isLoggedIn: false,
      user: null,
      _hasHydrated: false,
      // Clear old user when a new token is set — prevents stale name from old session
      setToken: (token) => {
        syncAuthCookies(token);
        set({ token, isLoggedIn: !!token, user: token ? undefined : null });
      },
      setUser: (user) => set((state) => {
        if (state.token) syncAuthCookies(state.token, user);
        return { user };
      }),
      logout: () => {
        syncAuthCookies(null);
        set({ token: null, isLoggedIn: false, user: null });
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "voqly-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        user: state.user,
      }),
      // Called after the persisted state is loaded from localStorage
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Re-sync cookies on load so existing localStorage sessions can pass
        // the middleware (and stale cookies are cleared when logged out).
        if (state?.isLoggedIn && state.token) {
          syncAuthCookies(state.token, state.user);
        } else {
          syncAuthCookies(null);
        }
      },
    }
  )
);
