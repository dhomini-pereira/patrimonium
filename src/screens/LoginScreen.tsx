import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';

const LoginScreen = () => {
  const { colors } = useTheme();
  const { login, register, user, biometricEnabled, loginTimestamp, unlockWithBiometric } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const canUseBiometric = biometricEnabled && !!user && !!loginTimestamp;

  useEffect(() => {
    (async () => {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHw && enrolled);
    })();
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);
    const ok = await unlockWithBiometric();
    setLoading(false);
    if (!ok) {
      setError('Autenticação biométrica falhou. Use sua senha.');
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const success = isRegister
        ? await register(name, email, password)
        : await login(email, password);

      if (!success) {
        setError('Verifique seus dados e tente novamente.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.logoContainer}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="trending-up" size={36} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>FinançasPro</Text>
          <Text style={[styles.appDesc, { color: colors.textSecondary }]}>
            Seu assistente financeiro inteligente
          </Text>
        </View>

        <View style={styles.form}>
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Senha</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isRegister ? 'Criar conta' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
              {isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Criar uma'}
            </Text>
          </TouchableOpacity>

          {/* Biometric unlock */}
          {canUseBiometric && biometricAvailable && !isRegister && (
            <View style={styles.biometricContainer}>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>ou</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
              </View>
              <TouchableOpacity
                style={[styles.biometricBtn, { borderColor: colors.primary }]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Ionicons
                  name={Platform.OS === 'ios' ? 'finger-print' : 'finger-print'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.biometricText, { color: colors.primary }]}>
                  Desbloquear com biometria
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
  },
  appDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    gap: 0,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  error: {
    fontSize: 13,
    marginBottom: 12,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  biometricContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    width: '100%',
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LoginScreen;
