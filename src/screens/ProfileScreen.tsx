import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import InputField from '@/components/InputField';
import StatCard from '@/components/StatCard';

const ProfileScreen = () => {
  const { colors } = useTheme();
  const { user, updateProfile, logout } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    try {
      await updateProfile({ name, email });
      setEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch {
      Alert.alert('Erro', 'Falha ao atualizar perfil.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>

        {/* Info or Edit */}
        {editing ? (
          <View style={styles.formSection}>
            <InputField label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
            <InputField label="Email" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" />

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.mutedBg }]}
                onPress={() => setEditing(false)}
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <StatCard>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Nome</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{user?.name}</Text>
                </View>
              </View>
            </StatCard>
            <StatCard style={{ marginTop: 8 }}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email}</Text>
                </View>
              </View>
            </StatCard>

            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primary }]}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editBtnText}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Danger zone */}
        <View style={styles.dangerSection}>
          <TouchableOpacity
            style={[styles.dangerBtn, { backgroundColor: colors.destructiveBg }]}
            onPress={() =>
              Alert.alert('Sair', 'Deseja realmente sair?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: () => logout() },
              ])
            }
          >
            <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
            <Text style={[styles.dangerText, { color: colors.destructive }]}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700' },
  userEmail: { fontSize: 14, marginTop: 4 },
  formSection: {},
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
  infoSection: {},
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dangerSection: { marginTop: 40 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  dangerText: { fontSize: 15, fontWeight: '600' },
});

export default ProfileScreen;
