import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { Transaction, Category } from '@/types/finance';
import { formatCurrency, maskValue } from '@/lib/finance';

interface SpendingInsightsProps {
  transactions: Transaction[];
  categories: Category[];
  privacyMode: boolean;
}

interface CategoryInsight {
  category: Category;
  total: number;
  percentage: number;
}

const COLORS = ['#2563eb', '#dc2626', '#f59e0b', '#16a34a', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const SpendingInsights: React.FC<SpendingInsightsProps> = ({ transactions, categories, privacyMode }) => {
  const { colors } = useTheme();

  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

  if (totalExpense === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Sem despesas neste mês
        </Text>
      </View>
    );
  }

  const byCategory = new Map<string, number>();
  for (const tx of expenses) {
    const prev = byCategory.get(tx.categoryId) ?? 0;
    byCategory.set(tx.categoryId, prev + tx.amount);
  }

  const insights: CategoryInsight[] = Array.from(byCategory.entries())
    .map(([catId, total]) => ({
      category: categories.find((c) => c.id === catId) ?? { id: catId, name: 'Outros', icon: '📋', type: 'expense' as const },
      total,
      percentage: (total / totalExpense) * 100,
    }))
    .sort((a, b) => b.total - a.total);

  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  return (
    <View style={styles.container}>
      {insights.map((item, index) => {
        const barColor = COLORS[index % COLORS.length];
        return (
          <View key={item.category.id} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={styles.icon}>{item.category.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {item.category.name}
                  </Text>
                  <Text style={[styles.percent, { color: colors.textSecondary }]}>
                    {item.percentage.toFixed(0)}%
                  </Text>
                </View>
                {/* Bar */}
                <View style={[styles.barBg, { backgroundColor: colors.mutedBg }]}>
                  <View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: barColor }]} />
                </View>
              </View>
              <Text style={[styles.amount, { color: colors.expense }]}>
                {mv(item.total)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 16 },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
  row: {},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: { fontSize: 20 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 6 },
  percent: { fontSize: 12, fontWeight: '600' },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  amount: { fontSize: 13, fontWeight: '600', minWidth: 80, textAlign: 'right' },
});

export default SpendingInsights;
