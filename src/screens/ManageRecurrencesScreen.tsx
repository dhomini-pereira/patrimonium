import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, formatDateShort } from '@/lib/finance';
import StatCard from '@/components/StatCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import PillButton from '@/components/PillButton';
import type { Transaction } from '@/types/finance';

const recurrenceLabel: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

const PAGE_SIZE = 10;

const ManageRecurrencesScreen = () => {
  const { colors } = useTheme();
  const { privacyMode } = useAuthStore();
  const {
    transactions,
    categories,
    accounts,
    actionLoading,
    getRecurrenceChildren,
    toggleRecurrencePause,
    deleteRecurrenceWithHistory,
  } = useFinanceStore();

  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const getCat = (id: string) => categories.find((c) => c.id === id);
  const getAcc = (id: string) => accounts.find((a) => a.id === id);

  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pausing, setPausing] = useState<string | null>(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRecurrence, setSelectedRecurrence] = useState<Transaction | null>(null);
  const [children, setChildren] = useState<Transaction[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const recurringTransactions = useMemo(() => {
    const list = transactions.filter((t) => t.recurring || (t.recurrenceCount && t.recurrenceCurrent));

    switch (filter) {
      case 'active':
        return list.filter((t) => t.recurring && !t.recurrencePaused);
      case 'paused':
        return list.filter((t) => t.recurrencePaused);
      case 'finished':
        return list.filter((t) => !t.recurring && t.recurrenceCurrent);
      default:
        return list;
    }
  }, [transactions, filter]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter]);

  const displayed = useMemo(
    () => recurringTransactions.slice(0, visibleCount),
    [recurringTransactions, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, recurringTransactions.length));
  }, [recurringTransactions.length]);

  const getStatusInfo = (tx: Transaction) => {
    if (tx.recurrencePaused) return { label: 'Pausada', color: '#f59e0b', icon: 'pause-circle-outline' as const };
    if (!tx.recurring && tx.recurrenceCurrent) return { label: 'Finalizada', color: colors.textMuted, icon: 'checkmark-circle-outline' as const };
    return { label: 'Ativa', color: colors.income, icon: 'play-circle-outline' as const };
  };

  const handleTogglePause = async (tx: Transaction) => {
    setPausing(tx.id);
    try {
      await toggleRecurrencePause(tx.id, !tx.recurrencePaused);
    } catch {}
    setPausing(null);
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteRecurrenceWithHistory(toDelete.id);
      setDeleteVisible(false);
      setToDelete(null);
    } catch {}
    setDeleting(false);
  };

  const openDetail = async (tx: Transaction) => {
    setSelectedRecurrence(tx);
    setDetailVisible(true);
    setLoadingChildren(true);
    try {
      const kids = await getRecurrenceChildren(tx.id);
      setChildren(kids);
    } catch {
      setChildren([]);
    }
    setLoadingChildren(false);
  };

  const activeCount = transactions.filter((t) => t.recurring && !t.recurrencePaused).length;
  const pausedCount = transactions.filter((t) => t.recurrencePaused).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {/* Summary */}
            <View style={styles.summaryRow}>
              <StatCard style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Ionicons name="play-circle-outline" size={20} color={colors.income} />
                  <Text style={[styles.summaryCount, { color: colors.text }]}>{activeCount}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Ativas</Text>
                </View>
              </StatCard>
              <StatCard style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Ionicons name="pause-circle-outline" size={20} color="#f59e0b" />
                  <Text style={[styles.summaryCount, { color: colors.text }]}>{pausedCount}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pausadas</Text>
                </View>
              </StatCard>
            </View>

            {/* Filters */}
            <View style={styles.content}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <PillButton label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
                  <PillButton label="Ativas" active={filter === 'active'} onPress={() => setFilter('active')} />
                  <PillButton label="Pausadas" active={filter === 'paused'} onPress={() => setFilter('paused')} />
                  <PillButton label="Finalizadas" active={filter === 'finished'} onPress={() => setFilter('finished')} />
                </View>
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma recorrência encontrada
          </Text>
        }
        ListFooterComponent={
          visibleCount < recurringTransactions.length ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        renderItem={({ item: tx }) => {
          const cat = getCat(tx.categoryId);
          const acc = getAcc(tx.accountId ?? '');
          const status = getStatusInfo(tx);
          const parcelaText = tx.recurrenceCount
            ? `${tx.recurrenceCurrent ?? 0}/${tx.recurrenceCount}`
            : `${tx.recurrenceCurrent ?? 0}x`;

          return (
            <View style={styles.content}>
              <TouchableOpacity onPress={() => openDetail(tx)} activeOpacity={0.7}>
                <StatCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.left}>
                      <Text style={styles.icon}>{cat?.icon ?? '📋'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>
                        <Text style={[styles.txMeta, { color: colors.textMuted }]}>
                          {recurrenceLabel[tx.recurrence ?? ''] ?? tx.recurrence} · {parcelaText}
                          {acc ? ` · ${acc.name}` : ''}
                        </Text>
                        <View style={styles.statusRow}>
                          <Ionicons name={status.icon} size={14} color={status.color} />
                          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                          {tx.nextDueDate && tx.recurring && (
                            <Text style={[styles.nextDate, { color: colors.textMuted }]}>
                              Próxima: {formatDateShort(tx.nextDueDate)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.right}>
                      <Text
                        style={[
                          styles.amount,
                          { color: tx.type === 'income' ? colors.income : colors.expense },
                        ]}
                      >
                        {tx.type === 'income' ? '+' : '-'}{mv(tx.amount)}
                      </Text>
                      <View style={styles.actions}>
                        {/* Pause/resume */}
                        {tx.recurring && (
                          <TouchableOpacity
                            onPress={() => handleTogglePause(tx)}
                            disabled={pausing === tx.id}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {pausing === tx.id ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Ionicons
                                name={tx.recurrencePaused ? 'play-outline' : 'pause-outline'}
                                size={18}
                                color={tx.recurrencePaused ? colors.income : '#f59e0b'}
                              />
                            )}
                          </TouchableOpacity>
                        )}
                        {/* Delete */}
                        <TouchableOpacity
                          onPress={() => { setToDelete(tx); setDeleteVisible(true); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </StatCard>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Delete with history dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => { setDeleteVisible(false); setToDelete(null); }}
        onConfirm={handleDeleteConfirm}
        title="Excluir recorrência"
        message={`Deseja excluir "${toDelete?.description}" e todo o histórico de parcelas? Os saldos das contas serão revertidos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir tudo"
        destructive
        loading={deleting}
      />

      {/* Detail Modal — lista de parcelas */}
      <Modal visible={detailVisible} animationType="slide" transparent>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setDetailVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.surfaceBorder }]} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedRecurrence?.description}
              </Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Info */}
            {selectedRecurrence && (
              <View style={[styles.infoCard, { backgroundColor: colors.mutedBg }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Frequência</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {recurrenceLabel[selectedRecurrence.recurrence ?? ''] ?? '-'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Parcelas</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {selectedRecurrence.recurrenceCount
                      ? `${selectedRecurrence.recurrenceCurrent ?? 0} de ${selectedRecurrence.recurrenceCount}`
                      : `${selectedRecurrence.recurrenceCurrent ?? 0} (sem limite)`}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Valor</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: selectedRecurrence.type === 'income' ? colors.income : colors.expense },
                    ]}
                  >
                    {mv(selectedRecurrence.amount)}
                  </Text>
                </View>
                {selectedRecurrence.nextDueDate && selectedRecurrence.recurring && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Próxima</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatDateShort(selectedRecurrence.nextDueDate)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Children list */}
            <Text style={[styles.childrenTitle, { color: colors.textSecondary }]}>
              Histórico de parcelas
            </Text>

            {loadingChildren ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : children.length === 0 ? (
              <Text style={[styles.emptyChildren, { color: colors.textMuted }]}>
                Nenhuma parcela processada ainda
              </Text>
            ) : (
              <ScrollView style={styles.childrenScroll} showsVerticalScrollIndicator={false}>
                {children.map((child, idx) => {
                  const childCat = getCat(child.categoryId);
                  return (
                    <View
                      key={child.id}
                      style={[styles.childRow, { borderBottomColor: colors.surfaceBorder }]}
                    >
                      <View style={styles.childLeft}>
                        <View style={[styles.childBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.childBadgeText, { color: colors.primary }]}>
                            #{idx + 1}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.childDate, { color: colors.text }]}>
                            {formatDateShort(child.date)}
                          </Text>
                          <Text style={[styles.childCat, { color: colors.textMuted }]}>
                            {childCat?.icon} {childCat?.name ?? 'Sem categoria'}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.childAmount,
                          { color: child.type === 'income' ? colors.income : colors.expense },
                        ]}
                      >
                        {child.type === 'income' ? '+' : '-'}{mv(child.amount)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  summaryCard: { flex: 1 },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryCount: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 12 },
  content: { paddingHorizontal: 20 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  card: { marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  right: { alignItems: 'flex-end', gap: 8 },
  icon: { fontSize: 22, marginTop: 2 },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txMeta: { fontSize: 11, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  nextDate: { fontSize: 11, marginLeft: 8 },
  amount: { fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  infoCard: { borderRadius: 14, padding: 14, gap: 8, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600' },
  childrenTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  emptyChildren: { fontSize: 13, textAlign: 'center', marginTop: 20 },
  childrenScroll: { maxHeight: 300 },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  childLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  childBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childBadgeText: { fontSize: 12, fontWeight: '700' },
  childDate: { fontSize: 13, fontWeight: '500' },
  childCat: { fontSize: 11, marginTop: 2 },
  childAmount: { fontSize: 13, fontWeight: '700' },
});

export default ManageRecurrencesScreen;
