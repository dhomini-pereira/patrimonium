import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface FormModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  children: React.ReactNode;
}

const FormModal: React.FC<FormModalProps> = ({
  visible,
  onClose,
  title,
  onSave,
  saveLabel = 'Salvar',
  saving = false,
  children,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
          <Pressable
            style={[styles.content, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />
            <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.cancelBtn, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={onSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.saveBtn, { color: colors.primary }]}>{saveLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View>
                  {children}
                  {/* Espaço extra para que o teclado não tape os campos inferiores */}
                  <View style={{ height: Platform.OS === 'android' ? 200 : 40 }} />
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '50%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelBtn: {
    fontSize: 15,
  },
  saveBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bodyContent: {
    paddingBottom: 20,
  },
});

export default FormModal;
