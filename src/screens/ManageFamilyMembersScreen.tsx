import React, { useState } from 'react';
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
import type { FamilyMember } from '@/types/finance';

const ManageFamilyMembersScreen = () => {
  const { colors } = useTheme();
  const { familyMembers, addFamilyMember, updateFamilyMember, deleteFamilyMember } = useFinanceStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [toDelete, setToDelete] = useState<FamilyMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');

  const openAdd = () => {
    setEditing(null);
    setName('');
    setModalVisible(true);
  };

  const openEdit = (member: FamilyMember) => {
    setEditing(member);
    setName(member.name);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome do membro.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateFamilyMember(editing.id, { name: name.trim() });
      } else {
        await addFamilyMember({ name: name.trim() });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = (member: FamilyMember) => {
    setToDelete(member);
    setDeleteVisible(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleteVisible(false);
    setDeleting(true);
    try {
      await deleteFamilyMember(toDelete.id);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao excluir.');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const renderItem = ({ item }: { item: FamilyMember }) => (
    <StatCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => openEdit(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeletePress(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    </StatCard>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <FlatList
        data={familyMembers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhum membro da família cadastrado.
          </Text>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAdd}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Membro' : 'Novo Membro'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
        saving={saving}
      >
        <InputField
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Maria, João..."
        />
      </FormModal>

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => { setDeleteVisible(false); setToDelete(null); }}
        onConfirm={confirmDelete}
        title="Excluir membro"
        message={`Deseja excluir "${toDelete?.name}"? As transações vinculadas perderão a atribuição.`}
        confirmLabel="Excluir"
        destructive
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 16 },
  card: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 16 },
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
});

export default ManageFamilyMembersScreen;
