import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrencyInput } from '@/lib/finance';

interface CurrencyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (formatted: string) => void;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ label, value, onChangeText, style, ...props }) => {
  const { colors } = useTheme();

  const handleChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    onChangeText(formatted);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={handleChange}
        keyboardType="numeric"
        placeholder="R$ 0,00"
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
});

export default CurrencyInput;
