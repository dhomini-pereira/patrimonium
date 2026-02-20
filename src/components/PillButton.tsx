import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface PillButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

const PillButton: React.FC<PillButtonProps> = ({ label, active, onPress, style }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? colors.primary : colors.mutedBg,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: active ? colors.primaryForeground : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PillButton;
