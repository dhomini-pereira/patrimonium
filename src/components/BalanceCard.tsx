import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient' ;
import { useTheme } from '@/theme/ThemeProvider';

interface BalanceCardProps {
  label: string;
  value: string;
  children?: React.ReactNode;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ label, value, children }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.cardGradientStart }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  value: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
});

export default BalanceCard;
