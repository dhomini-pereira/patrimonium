import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import PillButton from '@/components/PillButton';
import InputField from '@/components/InputField';
import CurrencyInput from '@/components/CurrencyInput';
import type { RootStackParamList } from '@/navigation';
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/finance';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type TransactionFormNav = NativeStackNavigationProp<RootStackParamList, 'TransactionForm'>;
type TransactionFormRoute = RouteProp<RootStackParamList, 'TransactionForm'>;

const recurrenceOptions: { value: 'daily' | 'weekly' | 'monthly' | 'yearly'; label: string }[] = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const TransactionFormScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<TransactionFormNav>();
  const route = useRoute<TransactionFormRoute>();
  const { categories, accounts, creditCards, transactions, addTransaction, updateTransaction } = useFinanceStore();

  const transactionId = route.params?.transactionId;
  const existingTx = useMemo(
    () => (transactionId ? transactions.find((t) => t.id === transactionId) : null),
    [transactionId, transactions],
  );
  const isEdit = !!existingTx;

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'creditCard'>('account');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recurrenceCount, setRecurrenceCount] = useState('');
  const [installments, setInstallments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingTx) {
      setType(existingTx.type);
      setDescription(existingTx.description);
      setAmount(formatCurrencyInput(String(Math.round(existingTx.amount * 100))));
      setCategoryId(existingTx.categoryId);
      if (existingTx.creditCardId) {
        setPaymentMethod('creditCard');
        setCreditCardId(existingTx.creditCardId);
        setAccountId('');
      } else {
        setPaymentMethod('account');
        setAccountId(existingTx.accountId || '');
        setCreditCardId('');
      }
      setDate(new Date(existingTx.date + 'T00:00:00'));
      setRecurring(existingTx.recurring);
      if (existingTx.recurrence) setRecurrence(existingTx.recurrence);
      if (existingTx.recurrenceCount) setRecurrenceCount(String(existingTx.recurrenceCount));
      if (existingTx.installments) setInstallments(String(existingTx.installments));
    }
  }, [existingTx]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Editar Transação' : 'Nova Transação' });
  }, [isEdit, navigation]);

  const filteredCats = categories.filter((c) => c.type === type);

  const formatDateDisplay = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toISODate = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError('');
    const parsedAmount = parseCurrencyInput(amount);
    if (!description.trim()) { setError('Informe a descrição.'); return; }
    if (!parsedAmount || parsedAmount <= 0) { setError('Informe um valor válido.'); return; }
    if (!categoryId) { setError('Selecione uma categoria.'); return; }

    const useCard = type === 'expense' && paymentMethod === 'creditCard';
    if (useCard && !creditCardId) { setError('Selecione um cartão de crédito.'); return; }
    if (!useCard && !accountId) { setError('Selecione uma conta.'); return; }

    const parsedInstallments = useCard && installments.trim() ? parseInt(installments, 10) : null;
    if (useCard && parsedInstallments !== null && (parsedInstallments < 1 || isNaN(parsedInstallments))) {
      setError('Número de parcelas inválido.'); return;
    }

    setLoading(true);
    try {
      const payload: any = {
        description: description.trim(),
        amount: parsedAmount,
        type,
        categoryId,
        accountId: useCard ? null : accountId,
        creditCardId: useCard ? creditCardId : null,
        date: toISODate(date),
        recurring,
        ...(recurring ? { recurrence } : {}),
        ...(recurring && recurrenceCount.trim() ? { recurrenceCount: parseInt(recurrenceCount, 10) || null } : {}),
        ...(useCard && parsedInstallments ? { installments: parsedInstallments } : {}),
      };

      if (isEdit && existingTx) {
        await updateTransaction(existingTx.id, payload);
      } else {
        await addTransaction(payload);
      }
    } catch {
      setError('Falha ao salvar. Tente novamente.');
      setLoading(false);
      return;
    }
    setLoading(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.typeRow}>
          <PillButton
            label="Despesa"
            active={type === 'expense'}
            onPress={() => { setType('expense'); setCategoryId(''); }}
            style={styles.typePill}
          />
          <PillButton
            label="Receita"
            active={type === 'income'}
            onPress={() => { setType('income'); setCategoryId(''); }}
            style={styles.typePill}
          />
        </View>

        <InputField label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex: Supermercado" />
        <CurrencyInput label="Valor" value={amount} onChangeText={setAmount} />

        {/* Seletor de data */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Data</Text>
        <TouchableOpacity
          style={[styles.dateBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDateDisplay(date)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
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

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Categoria</Text>
        {filteredCats.length === 0 ? (
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Nenhuma categoria de {type === 'income' ? 'receita' : 'despesa'} encontrada.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {filteredCats.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                style={[styles.chip, { backgroundColor: categoryId === cat.id ? colors.primary : colors.mutedBg }]}
              >
                <Text style={styles.chipEmoji}>{cat.icon}</Text>
                <Text style={[styles.chipText, { color: categoryId === cat.id ? '#fff' : colors.textSecondary }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
          {type === 'expense' ? 'Método de pagamento' : 'Conta'}
        </Text>

        {/* Payment method toggle (only for expenses) */}
        {type === 'expense' && creditCards.length > 0 && (
          <View style={styles.paymentMethodRow}>
            <PillButton
              label="Conta"
              active={paymentMethod === 'account'}
              onPress={() => { setPaymentMethod('account'); setCreditCardId(''); }}
            />
            <PillButton
              label="Cartão de Crédito"
              active={paymentMethod === 'creditCard'}
              onPress={() => { setPaymentMethod('creditCard'); setAccountId(''); }}
            />
          </View>
        )}

        {/* Account selector */}
        {(type === 'income' || paymentMethod === 'account') && (
          <>
            {type === 'expense' && creditCards.length === 0 && null}
            {accounts.length === 0 ? (
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Crie uma conta na aba "Contas" antes de adicionar transações.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => setAccountId(acc.id)}
                    style={[styles.chip, { backgroundColor: accountId === acc.id ? colors.primary : colors.mutedBg }]}
                  >
                    <Text style={[styles.chipText, { color: accountId === acc.id ? '#fff' : colors.textSecondary }]}>{acc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Credit card selector (only for expenses) */}
        {type === 'expense' && paymentMethod === 'creditCard' && (
          <>
            {creditCards.length === 0 ? (
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Cadastre um cartão de crédito primeiro.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {creditCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => setCreditCardId(card.id)}
                    style={[styles.chip, { backgroundColor: creditCardId === card.id ? card.color : colors.mutedBg }]}
                  >
                    <Ionicons name="card-outline" size={14} color={creditCardId === card.id ? '#fff' : colors.textSecondary} />
                    <Text style={[styles.chipText, { color: creditCardId === card.id ? '#fff' : colors.textSecondary }]}>{card.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Installments input (only for credit card) */}
            <View style={{ marginTop: 12 }}>
              <InputField
                label="Parcelas (opcional)"
                value={installments}
                onChangeText={(t) => setInstallments(t.replace(/[^0-9]/g, ''))}
                placeholder="Ex: 3 (vazio = à vista)"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </>
        )}

        {/* Recorrência */}
        <View style={[styles.recurringRow, { marginTop: 20 }]}>
          <View style={styles.recurringLeft}>
            <Ionicons name="repeat-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.recurringLabel, { color: colors.text }]}>Transação recorrente</Text>
          </View>
          <Switch
            value={recurring}
            onValueChange={setRecurring}
            trackColor={{ false: colors.mutedBg, true: colors.primary + '80' }}
            thumbColor={recurring ? colors.primary : '#f4f3f4'}
          />
        </View>

        {recurring && (
          <View style={styles.recurrenceChips}>
            {recurrenceOptions.map((opt) => (
              <PillButton
                key={opt.value}
                label={opt.label}
                active={recurrence === opt.value}
                onPress={() => setRecurrence(opt.value)}
              />
            ))}
          </View>
        )}

        {recurring && (
          <View style={{ marginTop: 12 }}>
            <InputField
              label="Número de parcelas (opcional)"
              value={recurrenceCount}
              onChangeText={setRecurrenceCount}
              placeholder="Ex: 12 (vazio = infinito)"
              keyboardType="numeric"
            />
          </View>
        )}

        {error ? (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: error ? 12 : 32, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.submitText}>{isEdit ? 'Salvar Alterações' : 'Adicionar Transação'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typePill: { flex: 1, alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipScroll: { marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 8, gap: 6 },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '500' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 13, fontStyle: 'italic', marginBottom: 8, paddingLeft: 4 },
  errorText: { fontSize: 13, fontWeight: '500', marginTop: 16, textAlign: 'center' },
  recurringRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recurringLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recurringLabel: { fontSize: 14, fontWeight: '500' },
  recurrenceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  paymentMethodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, marginBottom: 16 },
  dateBtnText: { fontSize: 15, fontWeight: '500' },
  dateConfirm: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  dateConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default TransactionFormScreen;
