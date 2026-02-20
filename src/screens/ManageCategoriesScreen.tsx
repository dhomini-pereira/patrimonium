import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import type { Category } from '@/types/finance';

const emojiOptions = [
  '💰', '💻', '📈', '📋', '🍔', '🚗', '🏠', '🎮',
  '🏥', '📚', '🛒', '📦', '✈️', '🎬', '🏋️', '💊',
  '🎵', '👕', '🐱', '🎁', '💡', '📱', '🏦', '🍕',
];

const PAGE_SIZE = 10;

const ManageCategoriesScreen = () => {
  const { colors } = useTheme();
  const { categories, addCategory, updateCategory, deleteCategory } = useFinanceStore();

  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📋');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const filtered = filter === 'all'
    ? categories
    : categories.filter((c) => c.type === filter);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter]);

  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  const incomeCount = categories.filter((c) => c.type === 'income').length;
  const expenseCount = categories.filter((c) => c.type === 'expense').length;

  const openAdd = () => {
    setEditing(null);
    setName('');
    setIcon('📋');
    setType('expense');
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setType(cat.type);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name, icon, type });
      } else {
        await addCategory({ name, icon, type });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar categoria.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (cat: Category) => {
    setToDelete(cat);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (toDelete) {
      setDeleting(true);
      try {
        await deleteCategory(toDelete.id);
        setDeleteVisible(false);
        setToDelete(null);
      } catch {
        setDeleteVisible(false);
        Alert.alert('Erro', 'Não foi possível excluir a categoria.');
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
            {/* Summary */}
            <View style={styles.summaryRow}>
              <StatCard style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Ionicons name="arrow-up-circle-outline" size={20} color={colors.income} />
                  <Text style={[styles.summaryCount, { color: colors.text }]}>{incomeCount}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Receitas</Text>
                </View>
              </StatCard>
              <StatCard style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Ionicons name="arrow-down-circle-outline" size={20} color={colors.expense} />
                  <Text style={[styles.summaryCount, { color: colors.text }]}>{expenseCount}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Despesas</Text>
                </View>
              </StatCard>
            </View>
            <View style={styles.content}>
              {/* Filter */}
              <View style={styles.filterRow}>
                <PillButton label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
                <PillButton label="Receitas" active={filter === 'income'} onPress={() => setFilter('income')} />
                <PillButton label="Despesas" active={filter === 'expense'} onPress={() => setFilter('expense')} />
              </View>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={openAdd}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Adicionar Categoria</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListFooterComponent={
          visibleCount < filtered.length ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        renderItem={({ item: cat }) => (
          <View style={styles.content}>
            <StatCard style={styles.card}>
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={[styles.emojiBox, { backgroundColor: colors.mutedBg }]}>
                    <Text style={styles.emoji}>{cat.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                    <Text
                      style={[
                        styles.catType,
                        { color: cat.type === 'income' ? colors.income : colors.expense },
                      ]}
                    >
                      {cat.type === 'income' ? 'Receita' : 'Despesa'}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(cat)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(cat)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            </StatCard>
          </View>
        )}
      />

      {/* Add/Edit Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Categoria' : 'Nova Categoria'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
        saving={saving}
      >
        <InputField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Alimentação" />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo</Text>
        <View style={styles.typeRow}>
          <PillButton
            label="Receita"
            active={type === 'income'}
            onPress={() => setType('income')}
            style={{ flex: 1, alignItems: 'center' }}
          />
          <PillButton
            label="Despesa"
            active={type === 'expense'}
            onPress={() => setType('expense')}
            style={{ flex: 1, alignItems: 'center' }}
          />
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Ícone</Text>
        <View style={styles.emojiGrid}>
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
              <Text style={styles.emojiBtnText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormModal>

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Excluir categoria"
        message={`Deseja excluir "${toDelete?.name}"? Transações com esta categoria não serão afetadas.`}
        confirmLabel="Excluir"
        destructive
        loading={deleting}
      />
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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  card: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  catName: { fontSize: 14, fontWeight: '500' },
  catType: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emojiBtnText: { fontSize: 22 },
});

export default ManageCategoriesScreen;
