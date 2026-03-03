import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { authApi, saveTokens, clearTokens, loadTokens } from "@/services/api";
import type { User } from "@/types/finance";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const BIOMETRIC_LOCK_TIMEOUT_MS = 60 * 1000; // 1 minute

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  privacyMode: boolean;
  darkMode: boolean;
  biometricEnabled: boolean;
  biometricLocked: boolean;
  loginTimestamp: number | null;
  lastBackgroundTs: number | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  togglePrivacy: () => void;
  toggleDarkMode: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  enableBiometric: (enabled: boolean) => void;
  unlockWithBiometric: () => Promise<boolean>;
  checkSession: () => boolean;
  lockApp: () => void;
  handleReturnFromBackground: () => void;
  restoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      privacyMode: true,
      darkMode: false,
      biometricEnabled: false,
      biometricLocked: false,
      loginTimestamp: null,
      lastBackgroundTs: null,
      loading: false,

      login: async (email, password) => {
        try {
          set({ loading: true });
          const result = await authApi.login(email, password);
          await saveTokens({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          });
          set({
            user: result.user,
            isAuthenticated: true,
            biometricLocked: false,
            loginTimestamp: Date.now(),
            lastBackgroundTs: null,
            loading: false,
          });
          return true;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      register: async (name, email, password) => {
        try {
          set({ loading: true });
          const result = await authApi.register(name, email, password);
          await saveTokens({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          });
          set({
            user: result.user,
            isAuthenticated: true,
            biometricLocked: false,
            loginTimestamp: Date.now(),
            lastBackgroundTs: null,
            loading: false,
          });
          return true;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          const tokens = await loadTokens();
          if (tokens?.refreshToken) {
            await authApi.logout(tokens.refreshToken);
          }
        } catch {}
        await clearTokens();
        set({
          user: null,
          isAuthenticated: false,
          biometricEnabled: false,
          biometricLocked: false,
          loginTimestamp: null,
          lastBackgroundTs: null,
        });
      },

      togglePrivacy: () => set({ privacyMode: !get().privacyMode }),
      toggleDarkMode: () => set({ darkMode: !get().darkMode }),

      updateProfile: async (data) => {
        try {
          const updated = await authApi.updateProfile(data);
          set({ user: updated });
        } catch {}
      },

      enableBiometric: (enabled) => set({ biometricEnabled: enabled }),

      unlockWithBiometric: async () => {
        try {
          const hasHw = await LocalAuthentication.hasHardwareAsync();
          if (!hasHw) return false;
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          if (!isEnrolled) return false;

          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Desbloqueie para acessar o Patrimonium",
            cancelLabel: "Usar senha",
            disableDeviceFallback: false,
          });

          if (result.success) {
            set({ biometricLocked: false, lastBackgroundTs: null });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      checkSession: () => {
        const { loginTimestamp, isAuthenticated } = get();
        if (!isAuthenticated || !loginTimestamp) return false;
        const elapsed = Date.now() - loginTimestamp;
        if (elapsed > SESSION_DURATION_MS) {
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            biometricEnabled: false,
            biometricLocked: false,
            loginTimestamp: null,
            lastBackgroundTs: null,
          });
          return false;
        }
        return true;
      },

      // Called when the app transitions to background/inactive.
      // Records the exact moment the user left so we can measure elapsed time
      // when they come back.
      lockApp: () => {
        const { biometricEnabled, isAuthenticated } = get();
        if (biometricEnabled && isAuthenticated) {
          set({ lastBackgroundTs: Date.now() });
        }
      },

      // Called when the app transitions from background/inactive back to active.
      // Compares the current time against lastBackgroundTs to decide whether to
      // require biometric re-authentication.
      //
      // - If the user was away for >= BIOMETRIC_LOCK_TIMEOUT_MS (60 s) → lock
      // - If the user was away for < 60 s → don't lock, just clear the timestamp
      handleReturnFromBackground: () => {
        const { biometricEnabled, isAuthenticated, lastBackgroundTs } = get();

        if (!biometricEnabled || !isAuthenticated) return;

        // No recorded background timestamp means we can't measure duration.
        // This shouldn't normally happen, but if it does, don't lock.
        if (lastBackgroundTs == null) return;

        const elapsed = Date.now() - lastBackgroundTs;

        if (elapsed >= BIOMETRIC_LOCK_TIMEOUT_MS) {
          set({ biometricLocked: true, lastBackgroundTs: null });
        } else {
          // User came back quickly — no need to lock.
          set({ lastBackgroundTs: null });
        }
      },

      restoreSession: async () => {
        const tokens = await loadTokens();
        if (!tokens) return false;

        try {
          const user = await authApi.me();
          const { biometricEnabled, lastBackgroundTs } = get();

          // On a cold start (app was fully killed and re-opened) we need to
          // decide whether to show the biometric lock. We consider it a cold
          // start when lastBackgroundTs is still set (was persisted but the
          // return handler never ran because the process was killed).
          let shouldLock = false;
          if (biometricEnabled) {
            if (lastBackgroundTs != null) {
              // App was killed while in background — check how long ago
              const elapsed = Date.now() - lastBackgroundTs;
              shouldLock = elapsed >= BIOMETRIC_LOCK_TIMEOUT_MS;
            } else {
              // No background timestamp at all — fresh cold start after the
              // session was restored; always require biometric.
              shouldLock = true;
            }
          }

          set({
            user,
            isAuthenticated: true,
            biometricLocked: shouldLock,
            lastBackgroundTs: null,
          });
          return true;
        } catch {
          await clearTokens();
          set({ user: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: "finance-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        privacyMode: state.privacyMode,
        darkMode: state.darkMode,
        biometricEnabled: state.biometricEnabled,
        loginTimestamp: state.loginTimestamp,
        // Persist so that on cold start we can measure how long the user was
        // away and decide whether to require biometric authentication.
        lastBackgroundTs: state.lastBackgroundTs,
      }),
    },
  ),
);
