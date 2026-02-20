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
import ProgressBar from '@/components/ProgressBar';
import InputField from '@/components/InputField';
import CurrencyInput from '@/components/CurrencyInput';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { Goal } from '@/types/finance';

const emojiOptions = ['🎯', '🛡️', '✈️', '💻', '🏠', '🚗', '💍', '🎓', '💰', '🏖️', '🎮', '💎'];

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

const ManageGoalsScreen = () => {
  const { colors } = useTheme();
  const { goals, addGoal, updateGoal, deleteGoal } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [toDelete, setToDelete] = useState<Goal | null>(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const displayed = useMemo(() => goals.slice(0, visibleCount), [goals, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, goals.length));
  }, [goals.length]);

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const openAdd = () => {
    setEditing(null);
    setName('');
    setIcon('🎯');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline(null);
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setName(goal.name);
    setIcon(goal.icon);
    setTargetAmount(formatCurrencyInput(String(Math.round(goal.targetAmount * 100))));
    setCurrentAmount(formatCurrencyInput(String(Math.round(goal.currentAmount * 100))));
    setDeadline(goal.deadline ? new Date(goal.deadline + 'T00:00:00') : null);
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

  const handleDeadlineDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDeadline(selectedDate);
  };

  const handleSave = async () => {
    const target = parseCurrencyInput(targetAmount);
    const current = parseCurrencyInput(currentAmount);
    if (!name.trim() || target <= 0) return;
    setSaving(true);
    try {
      if (editing) {
        await updateGoal(editing.id, { name, icon, targetAmount: target, currentAmount: current, deadline: deadline ? toISODate(deadline) : '' });
      } else {
        await addGoal({ name, icon, targetAmount: target, currentAmount: current, deadline: deadline ? toISODate(deadline) : '' });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar meta.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (goal: Goal) => {
    setToDelete(goal);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (toDelete) {
      setDeleting(true);
      try {
        await deleteGoal(toDelete.id);
        setDeleteVisible(false);
        setToDelete(null);
      } catch (err: any) {
        Alert.alert('Erro', err.message || 'Falha ao excluir meta.');
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
            <BalanceCard label="Progresso geral" value={`${overallProgress.toFixed(0)}%`}>
              <ProgressBar value={overallProgress} height={6} />
              <View style={styles.progressFooter}>
                <Text style={styles.progressText}>{mv(totalCurrent)}</Text>
                <Text style={styles.progressText}>{mv(totalTarget)}</Text>
              </View>
            </BalanceCard>
            <View style={styles.content}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={openAdd}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Adicionar Meta</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListFooterComponent={
          visibleCount < goals.length ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        renderItem={({ item: goal }) => {
          const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const remaining = goal.targetAmount - goal.currentAmount;
          return (
            <View style={styles.content}>
              <StatCard style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardIcon}>{goal.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardName, { color: colors.text }]}>{goal.name}</Text>
                      {goal.deadline && (
                        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                          Prazo: {formatDate(goal.deadline)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <ProgressBar value={pct} />
                <View style={styles.cardFooter}>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    Atual: {mv(goal.currentAmount)}
                  </Text>
                  <Text style={[styles.footerPct, { color: colors.text }]}>{pct.toFixed(0)}%</Text>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    Meta: {mv(goal.targetAmount)}
                  </Text>
                </View>
                <Text style={[styles.footerRemaining, { color: colors.textMuted }]}>
                  Faltam {mv(remaining > 0 ? remaining : 0)}
                </Text>
              </StatCard>
            </View>
          );
        }}
      />

      {/* Add/Edit Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Meta' : 'Nova Meta'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
        saving={saving}
      >
        <InputField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Reserva de Emergência" />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ícone</Text>
        <View style={styles.emojiRow}>
          {emojiOptions.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => setIcon(emoji)}
              style={[
                styles.emojiBtn,
                {
                  backgroundColor: icon === emoji ? colors.primary : colors.mutedBg,
                },
              ]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <CurrencyInput label="Valor da Meta" value={targetAmount} onChangeText={setTargetAmount} />
          </View>
          <View style={{ flex: 1 }}>
            <CurrencyInput label="Valor Atual" value={currentAmount} onChangeText={setCurrentAmount} />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Prazo</Text>
        <TouchableOpacity
          style={[styles.dateBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={() => {
            if (!deadline) setDeadline(new Date());
            setShowDatePicker(true);
          }}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.dateBtnText, { color: deadline ? colors.text : colors.textMuted }]}>
            {deadline ? formatDateDisplay(deadline) : 'Selecionar prazo'}
          </Text>
        </TouchableOpacity>
        {deadline && (
          <TouchableOpacity onPress={() => setDeadline(null)} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.destructive, fontSize: 12, textAlign: 'right' }}>Remover prazo</Text>
          </TouchableOpacity>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={deadline || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDeadlineDateChange}
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
        title="Excluir meta"
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
    marginBottom: 10,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardIcon: { fontSize: 24 },
  cardName: { fontSize: 14, fontWeight: '500' },
  cardMeta: { fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerText: { fontSize: 11 },
  footerPct: { fontSize: 12, fontWeight: '600' },
  footerRemaining: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 22 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, marginBottom: 16 },
  dateBtnText: { fontSize: 15, fontWeight: '500' },
  dateConfirm: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  dateConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default ManageGoalsScreen;
