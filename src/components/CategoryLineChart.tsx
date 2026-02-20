import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Svg, {
  Path,
  Defs,
  Circle,
  Line,
  Rect,
  Text as SvgText,
  G,
  ClipPath,
} from 'react-native-svg';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import type { Transaction, Category } from '@/types/finance';
import { formatCurrency, maskValue } from '@/lib/finance';

const LINE_COLORS = [
  '#2563eb', '#dc2626', '#f59e0b', '#16a34a', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#e11d48',
];

interface CategoryLineChartProps {
  transactions: Transaction[];
  categories: Category[];
  height?: number;
  hidden?: boolean;
  privacyMode?: boolean;
}

type PeriodKey = '7d' | '14d' | '1m' | '1y' | 'custom';

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '14d', label: '14 dias' },
  { key: '1m', label: '1 mês' },
  { key: '1y', label: '1 ano' },
  { key: 'custom', label: 'Personalizado' },
];

const toISO = (d: Date): string => d.toISOString().split('T')[0];

const subtractDays = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const CategoryLineChart: React.FC<CategoryLineChartProps> = ({
  transactions,
  categories,
  height = 220,
  hidden = false,
  privacyMode = false,
}) => {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width - 80;
  const [selectedCatIdx, setSelectedCatIdx] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('1m');
  const [customStart, setCustomStart] = useState<Date>(subtractDays(30));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);

  const changePeriod = (key: PeriodKey) => {
    setPeriod(key);
    setSelectedCatIdx(null);
  };

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    if (period === 'custom') {
      start = customStart;
      end = customEnd;
    } else if (period === '7d') {
      start = subtractDays(6);
    } else if (period === '14d') {
      start = subtractDays(13);
    } else if (period === '1m') {
      start = subtractDays(29);
    } else {
      start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    }
    return { startDate: toISO(start), endDate: toISO(end) };
  }, [period, customStart, customEnd]);

  const filteredTransactions = useMemo(
    () => transactions.filter((t) => t.date >= startDate && t.date <= endDate),
    [transactions, startDate, endDate],
  );

  const expenseTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'expense'),
    [filteredTransactions],
  );

  const catTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of expenseTransactions) {
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return map;
  }, [expenseTransactions]);

  const activeCats = useMemo(
    () =>
      categories
        .filter((c) => c.type === 'expense' && catTotals.has(c.id))
        .sort((a, b) => (catTotals.get(b.id) ?? 0) - (catTotals.get(a.id) ?? 0))
        .slice(0, 6),
    [categories, catTotals],
  );

  const sortedDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const tx of expenseTransactions) dateSet.add(tx.date);
    return [...dateSet].sort().slice(-7);
  }, [expenseTransactions]);

  const toggleCat = useCallback((idx: number) => {
    setSelectedCatIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const handleDateChangeStart = (_e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setShowPickerStart(false);
    if (d) { setCustomStart(d); setSelectedCatIdx(null); }
  };

  const handleDateChangeEnd = (_e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') setShowPickerEnd(false);
    if (d) { setCustomEnd(d); setSelectedCatIdx(null); }
  };

  const formatDateBtn = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  if (hidden) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Oculto</Text>
      </View>
    );
  }

  if (activeCats.length === 0 || sortedDates.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sem dados</Text>
      </View>
    );
  }

  const marginLeft = 20;
  const marginRight = 20;
  const chartWidth = screenWidth - marginLeft - marginRight;
  const paddingTop = 28;
  const paddingBottom = 36;
  const legendHeight = 40;
  const svgHeight = height - legendHeight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const stepX = sortedDates.length > 1 ? chartWidth / (sortedDates.length - 1) : 0;

  type SeriesPoint = { x: number; y: number; value: number };
  const series: { cat: Category; color: string; points: SeriesPoint[] }[] = [];
  let globalMax = 1;

  for (let ci = 0; ci < activeCats.length; ci++) {
    const cat = activeCats[ci];
    let accumulated = 0;
    const pts: SeriesPoint[] = [];
    for (let di = 0; di < sortedDates.length; di++) {
      const dayTotal = expenseTransactions
        .filter((t) => t.categoryId === cat.id && t.date === sortedDates[di])
        .reduce((s, t) => s + t.amount, 0);
      accumulated += dayTotal;
      pts.push({ x: marginLeft + di * stepX, y: 0, value: accumulated });
      if (accumulated > globalMax) globalMax = accumulated;
    }
    series.push({ cat, color: LINE_COLORS[ci % LINE_COLORS.length], points: pts });
  }

  for (const s of series) {
    for (const p of s.points) {
      p.y = paddingTop + chartHeight - (p.value / globalMax) * chartHeight;
    }
  }

  const buildCurvePath = (pts: SeriesPoint[]) => {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpx1 = curr.x + stepX * 0.4;
      const cpx2 = next.x - stepX * 0.4;
      path += ` C ${cpx1} ${curr.y}, ${cpx2} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const formatLabel = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatVal = (v: number) => {
    if (privacyMode) return '•••';
    if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
    return `R$${v.toFixed(0)}`;
  };

  return (
    <View>
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

      <View style={{ height: svgHeight, position: 'relative' }}>
        <Svg width={screenWidth} height={svgHeight}>
          <Defs>
            <ClipPath id="catChartClip">
              <Rect x={0} y={0} width={screenWidth} height={svgHeight} />
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

          {/* Lines */}
          <G clipPath="url(#catChartClip)">
            {series.map((s, ci) => {
              const dimmed = selectedCatIdx !== null && selectedCatIdx !== ci;
              return (
                <Path
                  key={s.cat.id}
                  d={buildCurvePath(s.points)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={selectedCatIdx === ci ? 3 : 2}
                  strokeLinecap="round"
                  opacity={dimmed ? 0.2 : 1}
                />
              );
            })}
          </G>

          {/* Dots */}
          {series.map((s, ci) => {
            const dimmed = selectedCatIdx !== null && selectedCatIdx !== ci;
            if (dimmed) return null;
            return s.points.map((p, pi) => (
              <Circle
                key={`${s.cat.id}-${pi}`}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="#fff"
                stroke={s.color}
                strokeWidth={2}
              />
            ));
          })}

          {/* Tooltip do selecionado — último ponto */}
          {selectedCatIdx !== null && (() => {
            const s = series[selectedCatIdx];
            const lastPt = s.points[s.points.length - 1];
            const tooltipW = 80;
            let tx = lastPt.x - tooltipW / 2;
            if (tx < 0) tx = 0;
            if (tx + tooltipW > screenWidth) tx = screenWidth - tooltipW;
            return (
              <G>
                <Rect x={tx} y={0} width={tooltipW} height={22} rx={6} fill={s.color} />
                <SvgText x={tx + tooltipW / 2} y={15} fill="#fff" fontSize={10} fontWeight="700" textAnchor="middle">
                  {formatVal(lastPt.value)}
                </SvgText>
              </G>
            );
          })()}

          {/* X labels */}
          {sortedDates.map((date, i) => (
            <SvgText
              key={i}
              x={marginLeft + i * stepX}
              y={svgHeight - 6}
              fill={colors.textMuted}
              fontSize={9}
              fontWeight="500"
              textAnchor="middle"
            >
              {formatLabel(date)}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legend}>
        {series.map((s, ci) => (
          <Pressable
            key={s.cat.id}
            onPress={() => toggleCat(ci)}
            style={[
              styles.legendItem,
              {
                backgroundColor: selectedCatIdx === ci ? s.color + '20' : colors.mutedBg,
                borderColor: selectedCatIdx === ci ? s.color : 'transparent',
              },
            ]}
          >
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text
              style={[
                styles.legendText,
                { color: selectedCatIdx !== null && selectedCatIdx !== ci ? colors.textMuted : colors.text },
              ]}
              numberOfLines={1}
            >
              {s.cat.icon} {s.cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14 },
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
  legend: { marginTop: 4, paddingHorizontal: 4 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '500' },
});

export default CategoryLineChart;
