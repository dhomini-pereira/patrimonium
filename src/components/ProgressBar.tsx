import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface ProgressBarProps {
  value: number;
  height?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, height = 8 }) => {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View style={[styles.track, { height, backgroundColor: colors.mutedBg }]}>
      <View
        style={[
          styles.fill,
          {
            height,
            width: `${clamped}%`,
            backgroundColor: colors.primary,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 100,
  },
});

export default ProgressBar;
