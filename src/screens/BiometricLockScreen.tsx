import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';

const BiometricLockScreen = () => {
  const { colors } = useTheme();
  const { user, unlockWithBiometric, logout } = useAuthStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const handleUnlock = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 300));
    await unlockWithBiometric();
  }, [unlockWithBiometric]);

  useEffect(() => {
    handleUnlock();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
        handleUnlock();
      }
    });
    return () => sub.remove();
  }, [handleUnlock]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="trending-up" size={36} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Nexo</Text>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Olá, {user?.name ?? 'Usuário'} 👋
          </Text>
        </View>

        <View style={styles.middleSection}>
          <View style={[styles.lockCircle, { borderColor: colors.primary + '40' }]}>
            <Ionicons name="lock-closed" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.lockTitle, { color: colors.text }]}>App bloqueado</Text>
          <Text style={[styles.lockDesc, { color: colors.textSecondary }]}>
            Use {Platform.OS === 'ios' ? 'Face ID ou Touch ID' : 'biometria'} para desbloquear
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: colors.primary }]}
            onPress={handleUnlock}
          >
            <Ionicons name="finger-print" size={24} color="#fff" />
            <Text style={styles.unlockText}>Desbloquear</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={[styles.logoutText, { color: colors.textMuted }]}>
              Entrar com outra conta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  topSection: {
    alignItems: 'center',
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 14,
    marginTop: 4,
  },
  middleSection: {
    alignItems: 'center',
  },
  lockCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  lockDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    width: '100%',
  },
  unlockText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 14,
  },
});

export default BiometricLockScreen;
