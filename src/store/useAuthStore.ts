import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { authApi, saveTokens, clearTokens, loadTokens } from '@/services/api';
import type { User } from '@/types/finance';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

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
          await saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
          set({
            user: result.user,
            isAuthenticated: true,
            biometricLocked: false,
            loginTimestamp: Date.now(),
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
          await saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
          set({
            user: result.user,
            isAuthenticated: true,
            biometricLocked: false,
            loginTimestamp: Date.now(),
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
            promptMessage: 'Desbloqueie para acessar o Nexo',
            cancelLabel: 'Usar senha',
            disableDeviceFallback: false,
          });

          if (result.success) {
            set({ biometricLocked: false, loginTimestamp: Date.now() });
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

      lockApp: () => {
        if (get().biometricEnabled && get().isAuthenticated) {
          set({ biometricLocked: true });
        }
      },

      handleReturnFromBackground: () => {},

      restoreSession: async () => {
        const tokens = await loadTokens();
        if (!tokens) return false;
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
          return true;
        } catch {
          await clearTokens();
          set({ user: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'finance-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        privacyMode: state.privacyMode,
        darkMode: state.darkMode,
        biometricEnabled: state.biometricEnabled,
        loginTimestamp: state.loginTimestamp,
      }),
    }
  )
);
