import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatCurrency, parseCurrencyInput } from '@/lib/finance';
import InputField from '@/components/InputField';
import CurrencyInput from '@/components/CurrencyInput';

const parseAmount = (raw: string): number => {
  if (raw.includes('R$')) return parseCurrencyInput(raw);
  const s = raw.trim();
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.')) || 0;
  }
  return parseFloat(s) || 0;
};

const TransferScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { accounts, transfer } = useFinanceStore();

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);
  const parsedAmount = parseAmount(amount);

  const canSubmit = !!fromId && !!toId && fromId !== toId && parsedAmount > 0 && !loading;

  const handleSelectFrom = (id: string) => {
    setFromId(id);
    if (toId === id) setToId('');
  };

  const handleTransfer = async () => {
    if (!canSubmit) return;

    if (fromAccount && parsedAmount > fromAccount.balance) {
      Alert.alert('Saldo insuficiente', `A conta "${fromAccount.name}" tem saldo de ${formatCurrency(fromAccount.balance)}.`);
      return;
    }

    setLoading(true);
    try {
      await transfer(fromId, toId, parsedAmount, description || undefined);
      setLoading(false);
      setSuccessVisible(true);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Falha ao realizar transferência.');
      setErrorVisible(true);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Conta de origem */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>De</Text>
        <View style={styles.accountList}>
          {accounts.map((acc) => {
            const selected = fromId === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                onPress={() => handleSelectFrom(acc.id)}
                style={[
                  styles.accountChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.mutedBg,
                    borderColor: selected ? colors.primary : colors.surfaceBorder,
                  },
                ]}
              >
                <View style={styles.chipRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountName, { color: selected ? '#fff' : colors.text }]}>
                      {acc.name}
                    </Text>
                    <Text style={[styles.accountBalance, { color: selected ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                      {formatCurrency(acc.balance)}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ícone de seta */}
        {fromId !== '' && (
          <View style={styles.arrowContainer}>
            <View style={[styles.arrowCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="arrow-down" size={20} color={colors.primary} />
            </View>
          </View>
        )}

        {/* Conta de destino */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Para</Text>
        <View style={styles.accountList}>
          {accounts
            .filter((a) => a.id !== fromId)
            .map((acc) => {
              const selected = toId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => setToId(acc.id)}
                  style={[
                    styles.accountChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.mutedBg,
                      borderColor: selected ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                >
                  <View style={styles.chipRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: selected ? '#fff' : colors.text }]}>
                        {acc.name}
                      </Text>
                      <Text style={[styles.accountBalance, { color: selected ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                        {formatCurrency(acc.balance)}
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          {fromId === '' && (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Selecione a conta de origem primeiro
            </Text>
          )}
        </View>

        {/* Valor e descrição */}
        <View style={{ marginTop: 20 }}>
          <CurrencyInput
            label="Valor"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={{ marginTop: 4 }}>
          <InputField
            label="Descrição (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Pagamento de fatura"
          />
        </View>

        {/* Resumo */}
        {canSubmit && (
          <View style={[styles.summaryCard, { backgroundColor: colors.mutedBg, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Resumo</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>De</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{fromAccount?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Para</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{toAccount?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Valor</Text>
              <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>
                {formatCurrency(parsedAmount)}
              </Text>
            </View>
          </View>
        )}

        {/* Botão de transferir */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: canSubmit ? colors.primary : colors.mutedBg },
          ]}
          onPress={handleTransfer}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={20} color={canSubmit ? '#fff' : colors.textMuted} />
              <Text style={[styles.submitText, { color: canSubmit ? '#fff' : colors.textMuted }]}>
                Transferir
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog
        visible={successVisible}
        onClose={() => { setSuccessVisible(false); navigation.goBack(); }}
        onConfirm={() => { setSuccessVisible(false); navigation.goBack(); }}
        title="Sucesso"
        message="Transferência realizada com sucesso!"
        confirmLabel="OK"
      />

      <ConfirmDialog
        visible={errorVisible}
        onClose={() => setErrorVisible(false)}
        onConfirm={() => setErrorVisible(false)}
        title="Erro"
        message={errorMsg}
        confirmLabel="OK"
        destructive
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  accountList: {
    gap: 8,
  },
  accountChip: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 12,
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 24,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TransferScreen;
