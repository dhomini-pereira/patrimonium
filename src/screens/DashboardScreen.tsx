import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, getMonthDates, formatDateShort } from '@/lib/finance';
import ScreenHeader from '@/components/ScreenHeader';
import BalanceCard from '@/components/BalanceCard';
import StatCard from '@/components/StatCard';
import SpendingChart from '@/components/SpendingChart';
import SpendingInsights from '@/components/SpendingInsights';
import CategoryLineChart from '@/components/CategoryLineChart';
import type { RootStackParamList } from '@/navigation';

const DashboardScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, privacyMode } = useAuthStore();
  const { accounts, transactions, categories, loading } = useFinanceStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const { start, end } = getMonthDates();

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date >= start && t.date <= end),
    [transactions, start, end]
  );

  const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);



  const recentTx = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [transactions]
  );
  const getCat = (id: string) => categories.find((c) => c.id === id);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Dashboard"
          subtitle={`Olá, ${user?.name ?? 'Usuário'} 👋`}
        />

        {/* Balance Card */}
        <BalanceCard label="Saldo total" value={mv(totalBalance)}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-up-outline" size={16} color="rgba(255,255,255,0.9)" />
              <View>
                <Text style={styles.balanceLabel}>Receitas</Text>
                <Text style={styles.balanceValue}>{mv(totalIncome)}</Text>
              </View>
            </View>
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-down-outline" size={16} color="rgba(255,255,255,0.9)" />
              <View>
                <Text style={styles.balanceLabel}>Despesas</Text>
                <Text style={styles.balanceValue}>{mv(totalExpense)}</Text>
              </View>
            </View>
          </View>
        </BalanceCard>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <StatCard style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-up-outline" size={16} color={colors.income} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Receitas</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.income }]}>{mv(totalIncome)}</Text>
          </StatCard>
          <StatCard style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-down-outline" size={16} color={colors.expense} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Despesas</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>{mv(totalExpense)}</Text>
          </StatCard>
        </View>

        {/* Spending Chart com filtro de período */}
        <View style={styles.section}>
          <StatCard>
            <SpendingChart transactions={transactions} hidden={privacyMode} />
          </StatCard>
        </View>

        {/* Gráfico de linha por categoria */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gastos por categoria</Text>
          <StatCard>
            <CategoryLineChart transactions={transactions} categories={categories} hidden={privacyMode} privacyMode={privacyMode} />
          </StatCard>
        </View>

        {/* Insights de gastos por categoria */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Insights do mês</Text>
          <StatCard>
            <SpendingInsights transactions={monthTx} categories={categories} privacyMode={privacyMode} />
          </StatCard>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transações recentes</Text>
          {recentTx.map((tx) => {
            const cat = getCat(tx.categoryId);
            return (
              <StatCard key={tx.id} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txIcon}>{cat?.icon ?? '📋'}</Text>
                    <View>
                      <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>
                      <Text style={[styles.txMeta, { color: colors.textMuted }]}>
                        {cat?.name} · {formatDateShort(tx.date)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'income' ? colors.income : colors.expense },
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {mv(tx.amount)}
                  </Text>
                </View>
              </StatCard>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('TransactionForm')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  balanceRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  txCard: {
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txIcon: {
    fontSize: 22,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '500',
  },
  txMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

export default DashboardScreen;
