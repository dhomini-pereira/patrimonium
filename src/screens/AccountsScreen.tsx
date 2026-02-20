import React, { useState, useCallback, useMemo } from 'react';
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
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, accountTypeLabel, accountTypeIcon, parseCurrencyInput, formatCurrencyInput } from '@/lib/finance';
import ScreenHeader from '@/components/ScreenHeader';
import BalanceCard from '@/components/BalanceCard';
import StatCard from '@/components/StatCard';
import InputField from '@/components/InputField';
import CurrencyInput from '@/components/CurrencyInput';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import PillButton from '@/components/PillButton';
import type { Account } from '@/types/finance';

const colorOptions = [
  { value: '#eab308', label: 'Amarelo' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#0ea5e9', label: 'Azul' },
  { value: '#2563eb', label: 'Azul Escuro' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#06b6d4', label: 'Ciano' },
];

const accountTypes: { value: Account['type']; label: string }[] = [
  { value: 'wallet', label: 'Carteira' },
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'digital', label: 'Conta Digital' },
  { value: 'investment', label: 'Investimentos' },
];

const PAGE_SIZE = 10;

const parseAmount = (text: string): number => {
  if (!text || !text.trim()) return 0;
  let cleaned = text.trim();
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const AccountsScreen = () => {
  const { colors } = useTheme();
  const { accounts, addAccount, updateAccount, deleteAccount, actionLoading } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const displayed = useMemo(() => accounts.slice(0, visibleCount), [accounts, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, accounts.length));
  }, [accounts.length]);

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(colorOptions[0].value);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setType('checking');
    setBalance('');
    setColor(colorOptions[0].value);
    setModalVisible(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setBalance(formatCurrencyInput(String(Math.round(account.balance * 100))));
    setColor(account.color);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const balanceNum = parseCurrencyInput(balance);
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateAccount(editing.id, { name, type, balance: balanceNum, color });
      } else {
        await addAccount({ name, type, balance: balanceNum, color });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar conta.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (account: Account) => {
    setToDelete(account);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteAccount(toDelete.id);
      setDeleteVisible(false);
      setToDelete(null);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao excluir conta.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <ScreenHeader title="Contas" />
            <BalanceCard label="Saldo consolidado" value={mv(total)} />
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma conta cadastrada. Toque no + para adicionar.
          </Text>
        }
        ListFooterComponent={
          visibleCount < accounts.length ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={{ height: 100 }} />
          )
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item: account }) => (
          <View style={styles.list}>
            <TouchableOpacity onPress={() => openEdit(account)} activeOpacity={0.7}>
              <StatCard style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.left}>
                    <View style={[styles.iconBox, { backgroundColor: account.color + '20' }]}>
                      <Ionicons
                        name={(accountTypeIcon[account.type] || 'wallet-outline') as any}
                        size={22}
                        color={account.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
                      <Text style={[styles.type, { color: colors.textMuted }]}>{accountTypeLabel[account.type]}</Text>
                    </View>
                  </View>
                  <View style={styles.right}>
                    <Text style={[styles.balance, { color: colors.text }]}>{mv(account.balance)}</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        onPress={() => openEdit(account)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDelete(account)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </StatCard>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* FAB para adicionar conta */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Conta' : 'Nova Conta'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
        saving={saving}
      >
        <InputField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Nubank" />
        <CurrencyInput
          label="Saldo"
          value={balance}
          onChangeText={setBalance}
        />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo de conta</Text>
        <View style={styles.chipRow}>
          {accountTypes.map((at) => (
            <PillButton key={at.value} label={at.label} active={type === at.value} onPress={() => setType(at.value)} />
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Cor</Text>
        <View style={styles.colorRow}>
          {colorOptions.map((c) => (
            <TouchableOpacity
              key={c.value}
              onPress={() => setColor(c.value)}
              style={[styles.colorDot, { backgroundColor: c.value }, color === c.value && styles.colorSelected]}
            />
          ))}
        </View>
      </FormModal>

      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Excluir conta"
        message={`Deseja excluir "${toDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        loading={deleting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { paddingBottom: 20 },
  list: { paddingHorizontal: 20 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '500' },
  type: { fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  balance: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 40 },
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
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default AccountsScreen;
