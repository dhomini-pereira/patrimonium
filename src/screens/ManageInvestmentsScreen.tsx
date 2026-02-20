import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, formatDate, parseCurrencyInput, formatCurrencyInput } from '@/lib/finance';
import StatCard from '@/components/StatCard';
import BalanceCard from '@/components/BalanceCard';
import InputField from '@/components/InputField';
import CurrencyInput from '@/components/CurrencyInput';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { Investment } from '@/types/finance';

const investmentTypes = ['CDB', 'Tesouro', 'Ações', 'FII', 'Reserva', 'Cripto', 'Outro'];

const PAGE_SIZE = 10;

const parseAmount = (raw: string): number => {
  const s = raw.trim();
  if (s.includes(',') && s.includes('.')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.')) || 0;
  }
  return parseFloat(s) || 0;
};

const ManageInvestmentsScreen = () => {
  const { colors } = useTheme();
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalReturn = investments.reduce((s, i) => s + (i.currentValue - i.principal), 0);
  const totalPrincipal = investments.reduce((s, i) => s + i.principal, 0);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [toDelete, setToDelete] = useState<Investment | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('CDB');
  const [principal, setPrincipal] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [returnRate, setReturnRate] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const displayed = useMemo(() => investments.slice(0, visibleCount), [investments, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, investments.length));
  }, [investments.length]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setType('CDB');
    setPrincipal('');
    setCurrentValue('');
    setReturnRate('');
    setStartDate(new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEdit = (inv: Investment) => {
    setEditing(inv);
    setName(inv.name);
    setType(inv.type);
    setPrincipal(formatCurrencyInput(String(Math.round(inv.principal * 100))));
    setCurrentValue(formatCurrencyInput(String(Math.round(inv.currentValue * 100))));
    setReturnRate(inv.returnRate.toString());
    setStartDate(inv.startDate ? new Date(inv.startDate + 'T00:00:00') : new Date());
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const toISODate = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const handleSave = async () => {
    const principalNum = parseCurrencyInput(principal);
    const currentNum = parseCurrencyInput(currentValue);
    const rateNum = parseAmount(returnRate);
    if (!name.trim() || principalNum <= 0) return;
    setSaving(true);
    try {
      if (editing) {
        await updateInvestment(editing.id, {
          name,
          type,
          principal: principalNum,
          currentValue: currentNum || principalNum,
          returnRate: rateNum,
          startDate: toISODate(startDate),
        });
      } else {
        await addInvestment({
          name,
          type,
          principal: principalNum,
          currentValue: currentNum || principalNum,
          returnRate: rateNum,
          startDate: toISODate(startDate),
        });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar investimento.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (inv: Investment) => {
    setToDelete(inv);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (toDelete) {
      setDeleting(true);
      try {
        await deleteInvestment(toDelete.id);
        setDeleteVisible(false);
        setToDelete(null);
      } catch (err: any) {
        Alert.alert('Erro', err.message || 'Falha ao excluir investimento.');
      } finally {
        setDeleting(false);
      }
    }
  };

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
            <BalanceCard label="Total investido" value={mv(totalInvested)}>
              <View style={styles.balanceRow}>
                <View>
                  <Text style={styles.balanceLabel}>Investido</Text>
                  <Text style={styles.balanceValue}>{mv(totalPrincipal)}</Text>
                </View>
                <View>
                  <Text style={styles.balanceLabel}>Rendimento</Text>
                  <Text style={[styles.balanceValue, { color: '#93c5fd' }]}>+{mv(totalReturn)}</Text>
                </View>
              </View>
            </BalanceCard>
            <View style={styles.content}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={openAdd}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Adicionar Investimento</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListFooterComponent={
          visibleCount < investments.length ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        renderItem={({ item: inv }) => {
          const returnVal = inv.currentValue - inv.principal;
          const returnPct = inv.principal > 0 ? ((returnVal / inv.principal) * 100).toFixed(1) : '0';
          return (
            <View style={styles.content}>
              <StatCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{inv.name}</Text>
                    <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                      {inv.type} · {inv.returnRate}% a.a. · Desde {formatDate(inv.startDate)}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(inv)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(inv)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.valuesRow}>
                  <View>
                    <Text style={[styles.valueLabel, { color: colors.textMuted }]}>Investido</Text>
                    <Text style={[styles.valueText, { color: colors.text }]}>{mv(inv.principal)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.valueLabel, { color: colors.textMuted }]}>Atual</Text>
                    <Text style={[styles.valueText, { color: colors.text }]}>{mv(inv.currentValue)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.valueLabel, { color: colors.textMuted }]}>Retorno</Text>
                    <Text style={[styles.valueText, { color: returnVal >= 0 ? colors.income : colors.expense }]}>
                      {returnVal >= 0 ? '+' : ''}{mv(returnVal)} ({returnPct}%)
                    </Text>
                  </View>
                </View>
              </StatCard>
            </View>
          );
        }}
      />

      {/* Add/Edit Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Investimento' : 'Novo Investimento'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
        saving={saving}
      >
        <InputField label="Nome" value={name} onChangeText={setName} placeholder="Ex: CDB Banco Inter" />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo</Text>
        <View style={styles.typeRow}>
          {investmentTypes.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.typeChip,
                { backgroundColor: type === t ? colors.primary : colors.mutedBg },
              ]}
            >
              <Text style={[styles.typeChipText, { color: type === t ? '#fff' : colors.textSecondary }]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <CurrencyInput label="Capital investido" value={principal} onChangeText={setPrincipal} />
          </View>
          <View style={{ flex: 1 }}>
            <CurrencyInput label="Valor atual" value={currentValue} onChangeText={setCurrentValue} />
          </View>
        </View>

        <InputField label="Taxa de retorno (% a.a.)" value={returnRate} onChangeText={setReturnRate} placeholder="12.5" keyboardType="numeric" />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Data de início</Text>
        <TouchableOpacity
          style={[styles.dateBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDateDisplay(startDate)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            locale="pt-BR"
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity style={[styles.dateConfirm, { backgroundColor: colors.primary }]} onPress={() => setShowDatePicker(false)}>
            <Text style={styles.dateConfirmText}>Confirmar</Text>
          </TouchableOpacity>
        )}
      </FormModal>

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Excluir investimento"
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
  content: { paddingHorizontal: 20 },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  balanceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  balanceValue: { fontSize: 13, fontWeight: '600', color: '#fff', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardMeta: { fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  valueLabel: { fontSize: 10 },
  valueText: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  typeChipText: { fontSize: 13, fontWeight: '500' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, marginBottom: 16 },
  dateBtnText: { fontSize: 15, fontWeight: '500' },
  dateConfirm: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  dateConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default ManageInvestmentsScreen;
