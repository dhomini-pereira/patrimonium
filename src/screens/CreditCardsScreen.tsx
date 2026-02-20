import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import {
  formatCurrency,
  maskValue,
  parseCurrencyInput,
  formatCurrencyInput,
} from "@/lib/finance";
import StatCard from "@/components/StatCard";
import InputField from "@/components/InputField";
import CurrencyInput from "@/components/CurrencyInput";
import FormModal from "@/components/FormModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { RootStackParamList } from "@/navigation";
import type { CreditCard } from "@/types/finance";

const colorOptions = [
  { value: "#eab308", label: "Amarelo" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#f97316", label: "Laranja" },
  { value: "#0ea5e9", label: "Azul" },
  { value: "#2563eb", label: "Azul Escuro" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#06b6d4", label: "Ciano" },
];

const PAGE_SIZE = 10;

const computeDefaultBestPurchaseDay = (closingDay: number): number => {
  if (!closingDay || closingDay < 1 || closingDay > 31) return 1;
  return closingDay >= 31 ? 1 : closingDay + 1;
};

const CreditCardsScreen = () => {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { creditCards, addCreditCard, updateCreditCard, deleteCreditCard } =
    useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [toDelete, setToDelete] = useState<CreditCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [bestPurchaseDay, setBestPurchaseDay] = useState("");
  const [bestPurchaseDayTouched, setBestPurchaseDayTouched] = useState(false);
  const [color, setColor] = useState(colorOptions[0].value);

  const displayed = useMemo(
    () => creditCards.slice(0, visibleCount),
    [creditCards, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, creditCards.length));
  }, [creditCards.length]);

  const totalLimit = creditCards.reduce((s, c) => s + c.limit, 0);
  const totalUsed = creditCards.reduce((s, c) => s + c.usedAmount, 0);

  const handleClosingDayChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, "").slice(0, 2);
    setClosingDay(sanitized);

    if (!bestPurchaseDayTouched) {
      const parsed = parseInt(sanitized, 10);
      if (parsed >= 1 && parsed <= 31) {
        setBestPurchaseDay(String(computeDefaultBestPurchaseDay(parsed)));
      } else {
        setBestPurchaseDay("");
      }
    }
  };

  const handleBestPurchaseDayChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, "").slice(0, 2);
    setBestPurchaseDay(sanitized);
    setBestPurchaseDayTouched(true);
  };

  const openAdd = () => {
    setEditing(null);
    setName("");
    setLimit("");
    setClosingDay("");
    setDueDay("");
    setBestPurchaseDay("");
    setBestPurchaseDayTouched(false);
    setColor(colorOptions[0].value);
    setModalVisible(true);
  };

  const openEdit = (card: CreditCard) => {
    setEditing(card);
    setName(card.name);
    setLimit(formatCurrencyInput(String(Math.round(card.limit * 100))));
    setClosingDay(String(card.closingDay));
    setDueDay(String(card.dueDay));
    setBestPurchaseDay(
      String(
        card.bestPurchaseDay || computeDefaultBestPurchaseDay(card.closingDay),
      ),
    );
    setBestPurchaseDayTouched(true);
    setColor(card.color);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const limitNum = parseCurrencyInput(limit);
    const closing = parseInt(closingDay, 10);
    const due = parseInt(dueDay, 10);
    const bestDay =
      parseInt(bestPurchaseDay, 10) || computeDefaultBestPurchaseDay(closing);

    if (!name.trim()) return;
    if (!limitNum || limitNum <= 0) return;
    if (!closing || closing < 1 || closing > 31) return;
    if (!due || due < 1 || due > 31) return;
    if (bestDay < 1 || bestDay > 31) return;

    setSaving(true);
    try {
      if (editing) {
        await updateCreditCard(editing.id, {
          name,
          limit: limitNum,
          closingDay: closing,
          dueDay: due,
          bestPurchaseDay: bestDay,
          color,
        });
      } else {
        await addCreditCard({
          name,
          limit: limitNum,
          closingDay: closing,
          dueDay: due,
          bestPurchaseDay: bestDay,
          color,
        });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao salvar cartão.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (card: CreditCard) => {
    setToDelete(card);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCreditCard(toDelete.id);
      setDeleteVisible(false);
      setToDelete(null);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao excluir cartão.");
    } finally {
      setDeleting(false);
    }
  };

  const usagePercent = (card: CreditCard) =>
    card.limit > 0 ? Math.min(100, (card.usedAmount / card.limit) * 100) : 0;

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return colors.destructive;
    if (pct >= 70) return colors.warning;
    return colors.income;
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            <View style={styles.summaryContainer}>
              <StatCard>
                <View style={styles.summaryRow}>
                  <View>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Limite total
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {mv(totalLimit)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Utilizado
                    </Text>
                    <Text
                      style={[styles.summaryValue, { color: colors.expense }]}
                    >
                      {mv(totalUsed)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.usageBarBg,
                    { backgroundColor: colors.mutedBg },
                  ]}
                >
                  <View
                    style={[
                      styles.usageBarFill,
                      {
                        backgroundColor: getUsageColor(
                          totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0,
                        ),
                        width: `${totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.summaryAvailable, { color: colors.textMuted }]}
                >
                  Disponível:{" "}
                  {mv(totalLimit - totalUsed > 0 ? totalLimit - totalUsed : 0)}
                </Text>
              </StatCard>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhum cartão cadastrado. Toque no + para adicionar.
          </Text>
        }
        ListFooterComponent={
          visibleCount < creditCards.length ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginVertical: 16 }}
            />
          ) : (
            <View style={{ height: 100 }} />
          )
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item: card }) => {
          const pct = usagePercent(card);
          const displayBestDay =
            card.bestPurchaseDay ||
            computeDefaultBestPurchaseDay(card.closingDay);

          return (
            <View style={styles.cardContainer}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("CreditCardDetail", { cardId: card.id })
                }
                activeOpacity={0.7}
              >
                <StatCard style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: card.color + "20" },
                        ]}
                      >
                        <Ionicons
                          name="card-outline"
                          size={22}
                          color={card.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardName, { color: colors.text }]}>
                          {card.name}
                        </Text>
                        <Text
                          style={[styles.cardMeta, { color: colors.textMuted }]}
                        >
                          Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        onPress={() => openEdit(card)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDelete(card)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={colors.destructive}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Best purchase day badge */}
                  <View
                    style={[
                      styles.bestDayBadge,
                      { backgroundColor: colors.income + "15" },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={colors.income}
                    />
                    <Text
                      style={[styles.bestDayText, { color: colors.income }]}
                    >
                      Melhor dia de compra: {displayBestDay}
                    </Text>
                  </View>

                  {/* Usage bar */}
                  <View
                    style={[
                      styles.usageBarBg,
                      { backgroundColor: colors.mutedBg },
                    ]}
                  >
                    <View
                      style={[
                        styles.usageBarFill,
                        {
                          backgroundColor: getUsageColor(pct),
                          width: `${pct}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.usageRow}>
                    <Text
                      style={[styles.usageText, { color: colors.textMuted }]}
                    >
                      Utilizado: {mv(card.usedAmount)}
                    </Text>
                    <Text
                      style={[styles.usageText, { color: colors.textMuted }]}
                    >
                      Limite: {mv(card.limit)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.availableText, { color: colors.income }]}
                  >
                    Disponível: {mv(card.availableLimit)}
                  </Text>

                  {/* Navigate hint */}
                  <View
                    style={[
                      styles.detailHint,
                      { borderTopColor: colors.surfaceBorder },
                    ]}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.detailHintText, { color: colors.primary }]}
                    >
                      Ver faturas e extrato
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                </StatCard>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAdd}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Card Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? "Editar Cartão" : "Novo Cartão"}
        onSave={handleSave}
        saveLabel={editing ? "Salvar" : "Adicionar"}
        saving={saving}
      >
        <InputField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Nubank"
        />
        <CurrencyInput label="Limite" value={limit} onChangeText={setLimit} />
        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <InputField
              label="Dia do fechamento"
              value={closingDay}
              onChangeText={handleClosingDayChange}
              placeholder="Ex: 25"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label="Dia do vencimento"
              value={dueDay}
              onChangeText={(t) =>
                setDueDay(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
              placeholder="Ex: 5"
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        </View>
        <View style={styles.bestDayInputWrapper}>
          <InputField
            label="Melhor dia de compra"
            value={bestPurchaseDay}
            onChangeText={handleBestPurchaseDayChange}
            placeholder={
              closingDay
                ? `Sugestão: ${computeDefaultBestPurchaseDay(parseInt(closingDay, 10) || 1)}`
                : "Ex: 26"
            }
            keyboardType="numeric"
            maxLength={2}
          />
          <Text style={[styles.bestDayHint, { color: colors.textMuted }]}>
            Dia após o fechamento para aproveitar o maior prazo da fatura.
            {closingDay
              ? ""
              : " Será calculado automaticamente ao definir o dia do fechamento."}
          </Text>
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          Cor
        </Text>
        <View style={styles.colorRow}>
          {colorOptions.map((c) => (
            <TouchableOpacity
              key={c.value}
              onPress={() => setColor(c.value)}
              style={[
                styles.colorDot,
                { backgroundColor: c.value },
                color === c.value && styles.colorSelected,
              ]}
            />
          ))}
        </View>
      </FormModal>

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Excluir cartão"
        message={`Deseja excluir "${toDelete?.name}"? Todas as faturas associadas também serão excluídas. Esta ação não pode ser desfeita.`}
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
  summaryContainer: { paddingHorizontal: 20, marginBottom: 16, marginTop: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  summaryAvailable: { fontSize: 12, textAlign: "center", marginTop: 6 },
  cardContainer: { paddingHorizontal: 20 },
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { fontSize: 14, fontWeight: "600" },
  cardMeta: { fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 12 },
  bestDayBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  bestDayText: {
    fontSize: 11,
    fontWeight: "600",
  },
  usageBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  usageBarFill: { height: 6, borderRadius: 3 },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  usageText: { fontSize: 11 },
  availableText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  detailHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailHintText: { fontSize: 13, fontWeight: "600" },
  emptyText: { textAlign: "center", fontSize: 14, marginTop: 40 },
  fab: {
    position: "absolute",
    bottom: 16,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  rowInputs: { flexDirection: "row", gap: 12 },
  bestDayInputWrapper: { marginBottom: 4 },
  bestDayHint: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: -10,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default CreditCardsScreen;
