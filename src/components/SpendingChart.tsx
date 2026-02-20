import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Platform, TouchableOpacity } from 'react-native';
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import type { Transaction } from '@/types/finance';

interface SpendingChartProps {
  transactions: Transaction[];
  height?: number;
  hidden?: boolean;
}

type PeriodKey = '7d' | '14d' | '1m' | '1y' | 'custom';

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '14d', label: '14 dias' },
  { key: '1m', label: '1 mês' },
  { key: '1y', label: '1 ano' },
  { key: 'custom', label: 'Personalizado' },
];

const formatValue = (v: number): string => {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
};

const toISO = (d: Date): string => d.toISOString().split('T')[0];

const subtractDays = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const SpendingChart: React.FC<SpendingChartProps> = ({ transactions, height = 180, hidden = false }) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width - 80;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('7d');

  const [customStart, setCustomStart] = useState<Date>(subtractDays(30));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);

  const handleTap = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  }, []);

  const changePeriod = (key: PeriodKey) => {
    setPeriod(key);
    setSelectedIndex(null);
  };

  const { startDate, endDate, bucketCount, bucketLabelFn, bucketMatchFn } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    let bCount: number;
    let labelFn: (i: number) => string;
    let matchFn: (txDate: string, i: number) => boolean;

    if (period === 'custom') {
      start = customStart;
      end = customEnd;
      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

      if (diffDays <= 14) {
        bCount = diffDays;
        labelFn = (i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        matchFn = (txDate, i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          return txDate === toISO(d);
        };
      } else {
        bCount = Math.min(diffDays, 7);
        const bucketSize = diffDays / bCount;
        labelFn = (i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + Math.round(i * bucketSize));
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        matchFn = (txDate, i) => {
          const dStart = new Date(start);
          dStart.setDate(dStart.getDate() + Math.round(i * bucketSize));
          const dEnd = new Date(start);
          dEnd.setDate(dEnd.getDate() + Math.round((i + 1) * bucketSize) - 1);
          return txDate >= toISO(dStart) && txDate <= toISO(dEnd);
        };
      }
    } else if (period === '7d') {
      start = subtractDays(6);
      bCount = 7;
      labelFn = (i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      matchFn = (txDate, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return txDate === toISO(d);
      };
    } else if (period === '14d') {
      start = subtractDays(13);
      bCount = 14;
      labelFn = (i) => {
        if (i % 2 !== 0) return '';
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      matchFn = (txDate, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return txDate === toISO(d);
      };
    } else if (period === '1m') {
      start = subtractDays(29);
      bCount = 6;
      const bucketSize = 30 / 6;
      labelFn = (i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + Math.round(i * bucketSize));
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      matchFn = (txDate, i) => {
        const dStart = new Date(start);
        dStart.setDate(dStart.getDate() + Math.round(i * bucketSize));
        const dEnd = new Date(start);
        dEnd.setDate(dEnd.getDate() + Math.round((i + 1) * bucketSize) - 1);
        return txDate >= toISO(dStart) && txDate <= toISO(dEnd);
      };
    } else {
      start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
      bCount = 12;
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      labelFn = (i) => {
        const m = new Date(start);
        m.setMonth(m.getMonth() + i);
        return months[m.getMonth()];
      };
      matchFn = (txDate, i) => {
        const m = new Date(start);
        m.setMonth(m.getMonth() + i);
        const txD = new Date(txDate + 'T00:00:00');
        return txD.getFullYear() === m.getFullYear() && txD.getMonth() === m.getMonth();
      };
    }

    return {
      startDate: toISO(start),
      endDate: toISO(end),
      bucketCount: bCount,
      bucketLabelFn: labelFn,
      bucketMatchFn: matchFn,
    };
  }, [period, customStart, customEnd]);

  const data = useMemo(() => {
    const expenseTxs = transactions.filter(
      (t) => t.type === 'expense' && t.date >= startDate && t.date <= endDate,
    );
    return Array.from({ length: bucketCount }, (_, i) => ({
      label: bucketLabelFn(i),
      value: expenseTxs.filter((t) => bucketMatchFn(t.date, i)).reduce((s, t) => s + t.amount, 0),
    }));
  }, [transactions, startDate, endDate, bucketCount, bucketLabelFn, bucketMatchFn]);

  const handleDateChangeStart = (_e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setShowPickerStart(false);
    if (d) { setCustomStart(d); setSelectedIndex(null); }
  };

  const handleDateChangeEnd = (_e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setShowPickerEnd(false);
    if (d) { setCustomEnd(d); setSelectedIndex(null); }
  };

  const formatDateBtn = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  if (hidden) {
    return (
      <View style={[styles.hiddenContainer, { height }]}>
        <Text style={[styles.hiddenText, { color: colors.textMuted }]}>Oculto</Text>
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
      const cpx2 = next.x - stepX * 0.4;
      path += ` C ${cpx1} ${curr.y}, ${cpx2} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = buildPath();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const getTooltipX = (px: number) => {
    const tooltipW = 72;
    let tx = px - tooltipW / 2;
    if (tx < 0) tx = 0;
    if (tx + tooltipW > screenWidth) tx = screenWidth - tooltipW;
    return tx;
  };

  return (
    <View>
      {/* Period pills */}
      <View style={styles.pillRow}>
        {PERIOD_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => changePeriod(opt.key)}
            style={[
              styles.pill,
              { backgroundColor: period === opt.key ? colors.primary : colors.mutedBg },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: period === opt.key ? '#fff' : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom date pickers */}
      {period === 'custom' && (
        <View style={styles.customRow}>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowPickerStart(true)}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDateBtn(customStart)}</Text>
          </TouchableOpacity>
          <Text style={[styles.dateTo, { color: colors.textMuted }]}>até</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowPickerEnd(true)}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.dateBtnText, { color: colors.text }]}>{formatDateBtn(customEnd)}</Text>
          </TouchableOpacity>
        </View>
      )}
      {showPickerStart && (
        <DateTimePicker value={customStart} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChangeStart} locale="pt-BR" />
      )}
      {showPickerStart && Platform.OS === 'ios' && (
        <TouchableOpacity style={[styles.dateConfirm, { backgroundColor: colors.primary }]} onPress={() => setShowPickerStart(false)}>
          <Text style={styles.dateConfirmText}>Confirmar</Text>
        </TouchableOpacity>
      )}
      {showPickerEnd && (
        <DateTimePicker value={customEnd} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChangeEnd} locale="pt-BR" />
      )}
      {showPickerEnd && Platform.OS === 'ios' && (
        <TouchableOpacity style={[styles.dateConfirm, { backgroundColor: colors.primary }]} onPress={() => setShowPickerEnd(false)}>
          <Text style={styles.dateConfirmText}>Confirmar</Text>
        </TouchableOpacity>
      )}

      {/* Chart */}
      {data.every((d) => d.value === 0) ? (
        <View style={[styles.hiddenContainer, { height }]}>
          <Text style={[styles.hiddenText, { color: colors.textMuted }]}>Sem gastos no período</Text>
        </View>
      ) : (
        <View style={{ height, position: 'relative' }}>
          <Svg width={screenWidth} height={height}>
            <Defs>
              <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.3} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
              <ClipPath id="chartClip">
                <Rect x={0} y={0} width={screenWidth} height={height} />
              </ClipPath>
            </Defs>

            {/* Grid lines */}
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
            <G clipPath="url(#chartClip)">
              <Path d={areaPath} fill="url(#areaGrad)" />
              <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" />
            </G>

            {/* Vertical selection line */}
            {selectedIndex !== null && (
              <Line
                x1={points[selectedIndex].x}
                y1={paddingTop}
                x2={points[selectedIndex].x}
                y2={height - paddingBottom}
                stroke={colors.primary}
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
                    <Circle cx={p.x} cy={p.y} r={10} fill={colors.primary} opacity={0.15} />
                  )}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? 5 : 3.5}
                    fill={isSelected ? '#fff' : colors.primary}
                    stroke={colors.primary}
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
                  width={72}
                  height={22}
                  rx={6}
                  fill={colors.primary}
                />
                <SvgText
                  x={getTooltipX(points[selectedIndex].x) + 36}
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
                fill={selectedIndex === i ? colors.primary : colors.textMuted}
                fontSize={9}
                fontWeight={selectedIndex === i ? '700' : '500'}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            ))}
          </Svg>

          {/* Touch areas */}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: { alignItems: 'center', justifyContent: 'center' },
  hiddenText: { fontSize: 14 },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  dateBtnText: { fontSize: 13, fontWeight: '500' },
  dateTo: { fontSize: 12 },
  dateConfirm: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  dateConfirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default SpendingChart;
