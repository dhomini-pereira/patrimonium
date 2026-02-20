import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  Rect,
  Text as SvgText,
  G,
  ClipPath,
} from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import type { Transaction } from '@/types/finance';
import { formatCurrency, maskValue } from '@/lib/finance';

interface MonthlyChartProps {
  transactions: Transaction[];
  height?: number;
  hidden?: boolean;
  privacyMode?: boolean;
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ transactions, height = 200, hidden = false, privacyMode = false }) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width - 80;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleTap = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  }, []);

  if (hidden) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Oculto</Text>
      </View>
    );
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekLabels: string[] = [];
  const weekTotals: number[] = [];
  const weekCount = Math.ceil(daysInMonth / 7);

  for (let w = 0; w < weekCount; w++) {
    const startDay = w * 7 + 1;
    const endDay = Math.min((w + 1) * 7, daysInMonth);
    weekLabels.push(`S${w + 1}`);

    let total = 0;
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const txDate = new Date(tx.date + 'T00:00:00');
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const day = txDate.getDate();
        if (day >= startDay && day <= endDay) {
          total += tx.amount;
        }
      }
    }
    weekTotals.push(total);
  }

  const data = weekLabels.map((label, i) => ({ label, value: weekTotals[i] }));

  if (data.every((d) => d.value === 0)) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sem gastos no mês</Text>
      </View>
    );
  }

  const marginLeft = 20;
  const marginRight = 20;
  const chartWidth = screenWidth - marginLeft - marginRight;
  const paddingTop = 32;
  const paddingBottom = 32;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: marginLeft + i * stepX,
    y: paddingTop + chartHeight - (d.value / maxValue) * chartHeight,
  }));

  const buildPath = () => {
    if (points.length < 2) {
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpx1 = curr.x + stepX * 0.4;
      const cpy1 = curr.y;
      const cpx2 = next.x - stepX * 0.4;
      const cpy2 = next.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = buildPath();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const formatValue = (v: number): string => {
    const text = v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`;
    return privacyMode ? '•••' : text;
  };

  const getTooltipX = (px: number) => {
    const tooltipW = 80;
    let tx = px - tooltipW / 2;
    if (tx < 0) tx = 0;
    if (tx + tooltipW > screenWidth) tx = screenWidth - tooltipW;
    return tx;
  };

  return (
    <View style={{ height, position: 'relative' }}>
      <Svg width={screenWidth} height={height}>
        <Defs>
          <LinearGradient id="monthAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.expense} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={colors.expense} stopOpacity={0} />
          </LinearGradient>
          <ClipPath id="monthChartClip">
            <Rect x={0} y={0} width={screenWidth} height={height} />
          </ClipPath>
        </Defs>

        {/* Grid */}
        {[0, 0.5, 1].map((frac) => {
          const y = paddingTop + chartHeight * (1 - frac);
          return (
            <Line
              key={frac}
              x1={marginLeft}
              y1={y}
              x2={screenWidth - marginRight}
              y2={y}
              stroke={colors.surfaceBorder}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Area & Line */}
        <G clipPath="url(#monthChartClip)">
          <Path d={areaPath} fill="url(#monthAreaGrad)" />
          <Path d={linePath} fill="none" stroke={colors.expense} strokeWidth={2.5} strokeLinecap="round" />
        </G>

        {/* Selection line */}
        {selectedIndex !== null && (
          <Line
            x1={points[selectedIndex].x}
            y1={paddingTop}
            x2={points[selectedIndex].x}
            y2={height - paddingBottom}
            stroke={colors.expense}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        )}

        {/* Dots */}
        {points.map((p, i) => {
          const isSelected = selectedIndex === i;
          return (
            <G key={i}>
              {isSelected && (
                <Circle cx={p.x} cy={p.y} r={10} fill={colors.expense} opacity={0.15} />
              )}
              <Circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 5 : 3.5}
                fill={isSelected ? '#fff' : colors.expense}
                stroke={colors.expense}
                strokeWidth={isSelected ? 2.5 : 0}
              />
            </G>
          );
        })}

        {/* Tooltip */}
        {selectedIndex !== null && (
          <G>
            <Rect
              x={getTooltipX(points[selectedIndex].x)}
              y={0}
              width={80}
              height={22}
              rx={6}
              fill={colors.expense}
            />
            <SvgText
              x={getTooltipX(points[selectedIndex].x) + 40}
              y={15}
              fill="#fff"
              fontSize={10}
              fontWeight="700"
              textAnchor="middle"
            >
              {formatValue(data[selectedIndex].value)}
            </SvgText>
          </G>
        )}

        {/* Labels */}
        {data.map((d, i) => (
          <SvgText
            key={i}
            x={points[i].x}
            y={height - 6}
            fill={selectedIndex === i ? colors.expense : colors.textMuted}
            fontSize={10}
            fontWeight={selectedIndex === i ? '700' : '500'}
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>

      {/* Touch areas – native Pressable overlays */}
      {points.map((p, i) => {
        const w = Math.max(stepX, 40);
        return (
          <Pressable
            key={`touch-${i}`}
            onPress={() => handleTap(i)}
            style={{
              position: 'absolute',
              left: p.x - w / 2,
              top: 0,
              width: w,
              height,
            }}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14 },
});

export default MonthlyChart;
