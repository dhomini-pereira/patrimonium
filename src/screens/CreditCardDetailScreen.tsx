import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, formatDateShort } from '@/lib/finance';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import PillButton from '@/components/PillButton';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { RootStackParamList } from '@/navigation';
import type { CreditCardInvoice } from '@/types/finance';

const formatMonth = (ref: string) => {
  const [year, month] = ref.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month, 10) - 1]}/${year}`;
};

type DetailRoute = RouteProp<RootStackParamList, 'CreditCardDetail'>;

const PAGE_SIZE = 15;

const CreditCardDetailScreen = () => {
  const { colors } = useTheme();
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cardId } = route.params;

  const {
    creditCards,
    transactions,
    categories,
    accounts,
    getInvoices,
    payInvoice,
    deleteTransaction,
    fetchAll,
  } = useFinanceStore();
  const { privacyMode, togglePrivacy } = useAuthStore();

  const card = creditCards.find((c) => c.id === cardId);
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const getCat = (id: string) => categories.find((c) => c.id === id);

  const [tab, setTab] = useState<'invoices' | 'transactions'>('invoices');

  const [invoices, setInvoices] = useState<CreditCardInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<CreditCardInvoice | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paying, setPaying] = useState(false);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; desc: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    loadInvoices();
  }, [cardId]);

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const result = await getInvoices(cardId);
      setInvoices(result);
    } catch {
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const cardTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.creditCardId === cardId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, cardId]);

  const displayed = useMemo(
    () => cardTransactions.slice(0, visibleCount),
    [cardTransactions, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, cardTransactions.length));
  }, [cardTransactions.length]);

  const usagePercent = card && card.limit > 0 ? Math.min(100, (card.usedAmount / card.limit) * 100) : 0;

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return colors.destructive;
    if (pct >= 70) return colors.warning;
    return colors.income;
  };

  const openPayModal = (invoice: CreditCardInvoice) => {
    setInvoiceToPay(invoice);
    setSelectedAccountId('');
    setPayModalVisible(true);
  };

  const handlePay = async () => {
    if (!invoiceToPay || !selectedAccountId) return;
    setPaying(true);
    try {
      await payInvoice(invoiceToPay.id, selectedAccountId);
      setPayModalVisible(false);
      await loadInvoices();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao pagar fatura.');
    } finally {
      setPaying(false);
    }
  };

  const handleDeletePress = (id: string, desc: string) => {
    setToDelete({ id, desc });
    setDeleteVisible(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleteVisible(false);
    setDeletingId(toDelete.id);
    try {
      await deleteTransaction(toDelete.id);
      await loadInvoices(); // refresh invoices after deleting transaction
    } catch {
    } finally {
      setDeletingId(null);
      setToDelete(null);
    }
  };

  if (!card) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Cartão não encontrado.</Text>
      </SafeAreaView>
    );
  }

  const sortedInvoices = [...invoices].sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth));

  const renderInvoiceItem = ({ item: inv }: { item: CreditCardInvoice }) => (
    <StatCard style={styles.invoiceCard}>
      <View style={styles.invoiceRow}>
        <View style={styles.invoiceLeft}>
          <View style={[styles.monthBadge, { backgroundColor: card.color + '18' }]}>
            <Ionicons name="calendar-outline" size={16} color={card.color} />
            <Text style={[styles.invoiceMonth, { color: card.color }]}>
              {formatMonth(inv.referenceMonth)}
            </Text>
          </View>
        </View>
        <Text style={[styles.invoiceTotal, { color: colors.expense }]}>{mv(inv.total)}</Text>
      </View>
      <View style={styles.invoiceActions}>
        {inv.paid ? (
          <View style={[styles.paidBadge, { backgroundColor: colors.income + '15' }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.income} />
            <Text style={[styles.paidText, { color: colors.income }]}>Paga</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: colors.primary }]}
            onPress={() => openPayModal(inv)}
          >
            <Ionicons name="wallet-outline" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Pagar fatura</Text>
          </TouchableOpacity>
        )}
      </View>
    </StatCard>
  );

  const renderTransactionItem = ({ item: tx }: { item: (typeof cardTransactions)[0] }) => {
    const cat = getCat(tx.categoryId);
    const installmentLabel =
      tx.installments && tx.installmentCurrent
        ? `${tx.installmentCurrent}/${tx.installments}x`
        : '';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TransactionForm', { transactionId: tx.id })}
        onLongPress={() => handleDeletePress(tx.id, tx.description)}
        activeOpacity={0.7}
      >
        <StatCard style={styles.txCard}>
          <View style={styles.txRow}>
            <View style={styles.txLeft}>
              <Text style={styles.txIcon}>{cat?.icon ?? '📋'}</Text>
              <View style={styles.txInfo}>
                <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text style={[styles.txMeta, { color: colors.textMuted }]}>
                  {cat?.name ?? 'Sem categoria'} · {formatDateShort(tx.date)}
                  {installmentLabel ? ` · ${installmentLabel}` : ''}
                  {tx.recurring ? ' · 🔄' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: colors.expense }]}>
                -{mv(tx.amount)}
              </Text>
              <View style={styles.txActions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('TransactionForm', { transactionId: tx.id })}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {deletingId === tx.id ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <TouchableOpacity
                    onPress={() => handleDeletePress(tx.id, tx.description)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </StatCard>
      </TouchableOpacity>
    );
  };

  const headerComponent = (
    <>
      <View style={styles.privacyRow}>
        <TouchableOpacity onPress={togglePrivacy} style={[styles.privacyBtn, { backgroundColor: colors.mutedBg }]}>
          <Ionicons
            name={privacyMode ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.headerContainer}>
        <StatCard>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: card.color + '20' }]}>  
              <Ionicons name="card" size={28} color={card.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text>
              <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                Fecha dia {card.closingDay} · Vence dia {card.dueDay}
              </Text>
            </View>
          </View>

          {/* Usage bar */}
          <View style={[styles.usageBarBg, { backgroundColor: colors.mutedBg }]}>
            <View
              style={[
                styles.usageBarFill,
                {
                  backgroundColor: getUsageColor(usagePercent),
                  width: `${usagePercent}%`,
                },
              ]}
            />
          </View>

          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Utilizado</Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>{mv(card.usedAmount)}</Text>
            </View>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Limite</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{mv(card.limit)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Disponível</Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>{mv(card.availableLimit)}</Text>
            </View>
          </View>
        </StatCard>
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        <PillButton
          label="Faturas"
          active={tab === 'invoices'}
          onPress={() => setTab('invoices')}
        />
        <PillButton
          label="Extrato"
          active={tab === 'transactions'}
          onPress={() => setTab('transactions')}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      {tab === 'invoices' ? (
        <FlatList
          data={sortedInvoices}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            loadingInvoices ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Nenhuma fatura encontrada.
              </Text>
            )
          }
          ListFooterComponent={<View style={{ height: 32 }} />}
          contentContainerStyle={styles.listContent}
          renderItem={renderInvoiceItem}
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhuma transação vinculada a este cartão.
            </Text>
          }
          ListFooterComponent={
            visibleCount < cardTransactions.length ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <View style={{ height: 32 }} />
            )
          }
          contentContainerStyle={styles.listContent}
          renderItem={renderTransactionItem}
        />
      )}

      {/* Pay Invoice Modal */}
      <FormModal
        visible={payModalVisible}
        onClose={() => setPayModalVisible(false)}
        title="Pagar Fatura"
        onSave={handlePay}
        saveLabel="Confirmar Pagamento"
        saving={paying}
      >
        {invoiceToPay && (
          <>
            <View style={[styles.payInfoCard, { backgroundColor: colors.mutedBg }]}>
              <Text style={[styles.payInfoLabel, { color: colors.textSecondary }]}>Fatura</Text>
              <Text style={[styles.payInfoValue, { color: colors.text }]}>
                {formatMonth(invoiceToPay.referenceMonth)}
              </Text>
              <Text style={[styles.payInfoLabel, { color: colors.textSecondary, marginTop: 8 }]}>Valor</Text>
              <Text style={[styles.payInfoAmount, { color: colors.expense }]}>
                {formatCurrency(invoiceToPay.total)}
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              Pagar com qual conta?
            </Text>
            {accounts.length === 0 ? (
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Nenhuma conta cadastrada.
              </Text>
            ) : (
              accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => setSelectedAccountId(acc.id)}
                  style={[
                    styles.accountOption,
                    {
                      backgroundColor: selectedAccountId === acc.id ? colors.primary + '15' : colors.surface,
                      borderColor: selectedAccountId === acc.id ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                >
                  <View style={styles.accountOptionLeft}>
                    <View style={[styles.accountDot, { backgroundColor: acc.color }]} />
                    <View>
                      <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
                      <Text style={[styles.accountBalance, { color: colors.textMuted }]}>
                        Saldo: {formatCurrency(acc.balance)}
                      </Text>
                    </View>
                  </View>
                  {selectedAccountId === acc.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </FormModal>

      {/* Delete Transaction Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => {
          setDeleteVisible(false);
          setToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Excluir transação"
        message={`Deseja excluir "${toDelete?.desc}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { paddingBottom: 20 },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  privacyBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: { paddingHorizontal: 20, marginTop: 8, marginBottom: 8 },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 18, fontWeight: '700' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  usageBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  usageBarFill: { height: 8, borderRadius: 4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },

  invoiceCard: { marginHorizontal: 20, marginBottom: 10 },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invoiceLeft: {},
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  invoiceMonth: { fontSize: 14, fontWeight: '600' },
  invoiceTotal: { fontSize: 16, fontWeight: '700' },
  invoiceActions: { alignItems: 'flex-end' },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  paidText: { fontSize: 13, fontWeight: '600' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  txCard: { marginHorizontal: 20, marginBottom: 8 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  txIcon: { fontSize: 22 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txMeta: { fontSize: 11, marginTop: 2 },
  txRight: { alignItems: 'flex-end', marginLeft: 8 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txActions: { flexDirection: 'row', gap: 12, marginTop: 6 },

  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  payInfoCard: { borderRadius: 14, padding: 16, marginBottom: 8 },
  payInfoLabel: { fontSize: 12 },
  payInfoValue: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  payInfoAmount: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  accountOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountDot: { width: 12, height: 12, borderRadius: 6 },
  accountName: { fontSize: 14, fontWeight: '500' },
  accountBalance: { fontSize: 12, marginTop: 2 },
  emptyHint: { fontSize: 13, fontStyle: 'italic', marginBottom: 8, paddingLeft: 4 },
});

export default CreditCardDetailScreen;
