import React, { useState, useEffect, useCallback } from 'react';
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
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import StatCard from '@/components/StatCard';
import InputField from '@/components/InputField';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import PillButton from '@/components/PillButton';
import ScreenHeader from '@/components/ScreenHeader';
import type { SharedAccount, Transaction } from '@/types/finance';
import { formatCurrency, formatDateShort } from '@/lib/finance';

const SharedAccountsScreen = () => {
  const { colors } = useTheme();
  const {
    accounts,
    inviteSharedAccount,
    listMyShares,
    removeShare,
    listSharedWithMe,
    getSharedTransactions,
  } = useFinanceStore();

  const [tab, setTab] = useState<'my' | 'shared'>('my');
  const [myShares, setMyShares] = useState<SharedAccount[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [toDelete, setToDelete] = useState<SharedAccount | null>(null);

  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [sharedTxs, setSharedTxs] = useState<Transaction[]>([]);
  const [viewingAccount, setViewingAccount] = useState<SharedAccount | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [my, shared] = await Promise.all([listMyShares(), listSharedWithMe()]);
      setMyShares(my);
      setSharedWithMe(shared);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const openInvite = () => {
    setEmail('');
    setSelectedAccountId('');
    setInviteVisible(true);
  };

  const handleInvite = async () => {
    if (!email.trim()) { Alert.alert('Erro', 'Informe o email.'); return; }
    if (!selectedAccountId) { Alert.alert('Erro', 'Selecione uma conta.'); return; }
    setSaving(true);
    try {
      await inviteSharedAccount(email.trim(), selectedAccountId);
      setInviteVisible(false);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao convidar.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (share: SharedAccount) => {
    setToDelete(share);
    setDeleteVisible(true);
  };

  const confirmRemove = async () => {
    if (!toDelete) return;
    setDeleteVisible(false);
    try {
      await removeShare(toDelete.id);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao remover.');
    } finally {
      setToDelete(null);
    }
  };

  const viewTransactions = async (share: SharedAccount) => {
    setViewingAccount(share);
    setTxModalVisible(true);
    setTxLoading(true);
    try {
      const txs = await getSharedTransactions(share.accountId);
      setSharedTxs(txs);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao carregar transações.');
      setTxModalVisible(false);
    } finally {
      setTxLoading(false);
    }
  };

  const renderMyShareItem = ({ item }: { item: SharedAccount }) => (
    <StatCard style={styles.card}>
      <View style={styles.shareRow}>
        <View style={styles.shareInfo}>
          <Text style={[styles.shareName, { color: colors.text }]}>{item.accountName}</Text>
          <Text style={[styles.shareMeta, { color: colors.textMuted }]}>
            Compartilhada com {item.sharedWithUserName}
          </Text>
          <Text style={[styles.shareEmail, { color: colors.textSecondary }]}>
            {item.sharedWithUserEmail}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRemove(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </StatCard>
  );

  const renderSharedWithMeItem = ({ item }: { item: SharedAccount }) => (
    <TouchableOpacity onPress={() => viewTransactions(item)} activeOpacity={0.7}>
      <StatCard style={styles.card}>
        <View style={styles.shareRow}>
          <View style={styles.shareInfo}>
            <Text style={[styles.shareName, { color: colors.text }]}>{item.accountName}</Text>
            <Text style={[styles.shareMeta, { color: colors.textMuted }]}>Somente leitura</Text>
          </View>
          <Ionicons name="eye-outline" size={18} color={colors.primary} />
        </View>
      </StatCard>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <View style={styles.tabRow}>
        <PillButton
          label="Minhas Compartilhadas"
          active={tab === 'my'}
          onPress={() => setTab('my')}
        />
        <PillButton
          label="Compartilhadas Comigo"
          active={tab === 'shared'}
          onPress={() => setTab('shared')}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 40 }} />
      ) : tab === 'my' ? (
        <FlatList
          data={myShares}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderMyShareItem}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhuma conta compartilhada.
            </Text>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      ) : (
        <FlatList
          data={sharedWithMe}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderSharedWithMeItem}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhuma conta foi compartilhada com você.
            </Text>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* FAB - Convidar (só na aba "Minhas") */}
      {tab === 'my' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={openInvite}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Invite Modal */}
      <FormModal
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        title="Convidar Usuário"
        onSave={handleInvite}
        saveLabel="Convidar"
        saving={saving}
      >
        <InputField
          label="Email do usuário"
          value={email}
          onChangeText={setEmail}
          placeholder="Ex: joao@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
          Qual conta compartilhar?
        </Text>
        {accounts.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>Nenhuma conta cadastrada.</Text>
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
                <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
              </View>
              {selectedAccountId === acc.id && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))
        )}
      </FormModal>

      {/* Transactions View Modal */}
      <FormModal
        visible={txModalVisible}
        onClose={() => { setTxModalVisible(false); setSharedTxs([]); setViewingAccount(null); }}
        title={viewingAccount ? `Transações · ${viewingAccount.accountName}` : 'Transações'}
        onSave={() => setTxModalVisible(false)}
        saveLabel="Fechar"
        saving={false}
      >
        {txLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 32 }} />
        ) : sharedTxs.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma transação encontrada.
          </Text>
        ) : (
          <View style={{ maxHeight: 400 }}>
            <FlatList
              data={sharedTxs}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: tx }) => (
                <View style={[styles.txItem, { borderBottomColor: colors.surfaceBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>
                    <Text style={[styles.txDate, { color: colors.textMuted }]}>
                      {formatDateShort(tx.date)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === 'income' ? colors.income : colors.expense },
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </FormModal>

      {/* Remove Share Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => { setDeleteVisible(false); setToDelete(null); }}
        onConfirm={confirmRemove}
        title="Remover compartilhamento"
        message={`Deseja remover o acesso de ${toDelete?.sharedWithUserName} à conta "${toDelete?.accountName}"?`}
        confirmLabel="Remover"
        destructive
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  listContent: { paddingHorizontal: 20 },
  card: { marginBottom: 10 },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareInfo: { flex: 1 },
  shareName: { fontSize: 15, fontWeight: '600' },
  shareMeta: { fontSize: 12, marginTop: 2 },
  shareEmail: { fontSize: 12, marginTop: 1 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 40 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  emptyHint: { fontSize: 13, fontStyle: 'italic', marginBottom: 8, paddingLeft: 4 },
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
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
});

export default SharedAccountsScreen;
