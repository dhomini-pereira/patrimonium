import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue } from '@/lib/finance';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import ProgressBar from '@/components/ProgressBar';
import type { RootStackParamList } from '@/navigation';

type MoreNav = NativeStackNavigationProp<RootStackParamList>;

const MoreScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<MoreNav>();
  const { investments, goals, transactions } = useFinanceStore();
  const { privacyMode, darkMode, biometricEnabled, toggleDarkMode, enableBiometric, logout } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHw && enrolled);
    })();
  }, []);

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalReturn = investments.reduce((s, i) => s + (i.currentValue - i.principal), 0);

  const handleExport = async () => {
    const data = JSON.stringify({ transactions }, null, 2);
    try {
      await Share.share({ message: data, title: 'Exportar Finanças' });
    } catch {}
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Mais" />

        {/* Investments Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="trending-up-outline" size={18} color={colors.investment} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Investimentos</Text>
            </View>
            {investments.length > 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('ManageInvestments')} style={styles.seeAllBtn}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todos</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <StatCard>
            <View style={styles.investRow}>
              <Text style={[styles.investLabel, { color: colors.textSecondary }]}>Total investido</Text>
              <Text style={[styles.investValue, { color: colors.text }]}>{mv(totalInvested)}</Text>
            </View>
            <View style={styles.investRow}>
              <Text style={[styles.investLabel, { color: colors.textSecondary }]}>Rendimento</Text>
              <Text style={[styles.investValue, { color: colors.income }]}>{mv(totalReturn)}</Text>
            </View>
          </StatCard>
          {investments.slice(0, 3).map((inv) => (
            <StatCard key={inv.id} style={styles.investCard}>
              <View style={styles.investItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.investName, { color: colors.text }]}>{inv.name}</Text>
                  <Text style={[styles.investMeta, { color: colors.textMuted }]}>
                    {inv.type} · {inv.returnRate}% a.a.
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.investVal, { color: colors.text }]}>{mv(inv.currentValue)}</Text>
                  <Text style={[styles.investReturn, { color: colors.income }]}>
                    +{mv(inv.currentValue - inv.principal)}
                  </Text>
                </View>
              </View>
            </StatCard>
          ))}
        </View>

        {/* Goals Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="flag-outline" size={18} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Metas</Text>
            </View>
            {goals.length > 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('ManageGoals')} style={styles.seeAllBtn}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {goals.slice(0, 3).map((goal) => {
            const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            return (
              <StatCard key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalLeft}>
                    <Text style={styles.goalIcon}>{goal.icon}</Text>
                    <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
                  </View>
                  <Text style={[styles.goalPct, { color: colors.textMuted }]}>{pct.toFixed(0)}%</Text>
                </View>
                <ProgressBar value={pct} />
                <View style={styles.goalFooter}>
                  <Text style={[styles.goalMeta, { color: colors.textMuted }]}>{mv(goal.currentAmount)}</Text>
                  <Text style={[styles.goalMeta, { color: colors.textMuted }]}>{mv(goal.targetAmount)}</Text>
                </View>
              </StatCard>
            );
          })}
        </View>

        {/* Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Gerenciamento</Text>

          <MenuItem
            icon="flag-outline"
            label="Gerenciar Metas"
            onPress={() => navigation.navigate('ManageGoals')}
            colors={colors}
            iconColor={colors.warning}
          />
          <MenuItem
            icon="card-outline"
            label="Cartões de Crédito"
            onPress={() => navigation.navigate('CreditCards')}
            colors={colors}
            iconColor="#8b5cf6"
          />
          <MenuItem
            icon="pricetag-outline"
            label="Gerenciar Categorias"
            onPress={() => navigation.navigate('ManageCategories')}
            colors={colors}
            iconColor={colors.investment}
          />
          <MenuItem
            icon="bar-chart-outline"
            label="Gerenciar Investimentos"
            onPress={() => navigation.navigate('ManageInvestments')}
            colors={colors}
            iconColor={colors.income}
          />
          <MenuItem
            icon="repeat-outline"
            label="Recorrências"
            onPress={() => navigation.navigate('ManageRecurrences')}
            colors={colors}
            iconColor="#f59e0b"
          />
          <MenuItem
            icon="swap-horizontal-outline"
            label="Transferência entre contas"
            onPress={() => navigation.navigate('Transfer')}
            colors={colors}
            iconColor={colors.primary}
          />
          <MenuItem
            icon="person-outline"
            label="Perfil"
            onPress={() => navigation.navigate('Profile')}
            colors={colors}
          />
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Configurações</Text>

          <StatCard>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Modo escuro</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: colors.mutedBg, true: colors.primary + '80' }}
                thumbColor={darkMode ? colors.primary : '#f4f3f4'}
              />
            </View>
          </StatCard>

          {biometricAvailable && (
            <StatCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="finger-print" size={18} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Bloqueio biométrico</Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={async (val) => {
                    if (val) {
                      const result = await LocalAuthentication.authenticateAsync({
                        promptMessage: 'Confirme para ativar biometria',
                        cancelLabel: 'Cancelar',
                      });
                      if (result.success) {
                        enableBiometric(true);
                      }
                    } else {
                      enableBiometric(false);
                    }
                  }}
                  trackColor={{ false: colors.mutedBg, true: colors.primary + '80' }}
                  thumbColor={biometricEnabled ? colors.primary : '#f4f3f4'}
                />
              </View>
            </StatCard>
          )}

          <TouchableOpacity onPress={handleExport}>
            <StatCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Exportar dados</Text>
                </View>
              </View>
            </StatCard>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout}>
            <StatCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
                  <Text style={[styles.settingLabel, { color: colors.destructive }]}>Sair</Text>
                </View>
              </View>
            </StatCard>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
  iconColor?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, colors, iconColor }) => (
  <TouchableOpacity onPress={onPress}>
    <StatCard style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name={icon as any} size={18} color={iconColor || colors.textSecondary} />
          <Text style={{ fontSize: 14, color: colors.text }}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </StatCard>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  investRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  investLabel: { fontSize: 13 },
  investValue: { fontSize: 14, fontWeight: '600' },
  investCard: { marginTop: 8 },
  investItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investName: { fontSize: 14, fontWeight: '500' },
  investMeta: { fontSize: 11, marginTop: 2 },
  investVal: { fontSize: 14, fontWeight: '600' },
  investReturn: { fontSize: 11, marginTop: 2 },
  goalCard: { marginBottom: 8 },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalIcon: { fontSize: 20 },
  goalName: { fontSize: 14, fontWeight: '500' },
  goalPct: { fontSize: 12 },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  goalMeta: { fontSize: 11 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: { fontSize: 14 },
  settingCard: { marginTop: 6 },
});

export default MoreScreen;
