import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle }) => {
  const { colors } = useTheme();
  const { privacyMode, togglePrivacy } = useAuthStore();

  return (
    <View style={styles.container}>
      <View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <TouchableOpacity onPress={togglePrivacy} style={[styles.iconBtn, { backgroundColor: colors.mutedBg }]}>
        <Ionicons
          name={privacyMode ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScreenHeader;
