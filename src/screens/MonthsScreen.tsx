import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/theme/ThemeProvider';
import { transactionsApi } from '@/services/api';
import { formatCurrency } from '@/lib/finance';
import ScreenHeader from '@/components/ScreenHeader';
import { RootStackParamList } from '@/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface MonthItem {
  totalAmount: number;
  month: string;
}

const PAGE_SIZE = 10;

function formatMonthLabel(month: string) {
  const [mm, yyyy] = month.split('/');

  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return `${months[Number(mm) - 1]} ${yyyy}`;
}

function getMeta(value: number) {
  if (value > 0) {
    return {
      color: '#22C55E',
      icon: 'trending-up',
      label: 'Saldo positivo',
    };
  }

  if (value < 0) {
    return {
      color: '#EF4444',
      icon: 'trending-down',
      label: 'Saldo negativo',
    };
  }

  return {
    color: '#F59E0B',
    icon: 'minus',
    label: 'Sem movimentação',
  };
}

const MonthsScreen = () => {
  const { colors } = useTheme();
  const privacyMode = useAuthStore(state => state.privacyMode);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [items, setItems] = useState<MonthItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = useCallback(
    async (targetPage: number, replace = false) => {
      if (loading) return;

      setLoading(true);

      try {
        const data = await transactionsApi.getMonths(targetPage);

        setItems(prev =>
          replace ? data : [...prev, ...data],
        );

        setHasMore(data.length === PAGE_SIZE);
        setPage(targetPage);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [loading],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      const data = await transactionsApi.getMonths(1);

      setItems(data);
      setPage(1);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || loading) return;

    fetchPage(page + 1);
  };

  const renderItem = ({ item }: { item: MonthItem }) => {
    const meta = getMeta(item.totalAmount);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() =>
          navigation.navigate('Transactions', {
            month: item.month,
          })
        }
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: privacyMode
                ? colors.mutedBg
                : `${meta.color}20`,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={
              privacyMode
                ? 'eye-off-outline'
                : (meta.icon as any)
            }
            size={24}
            color={
              privacyMode
                ? colors.textMuted
                : meta.color
            }
          />
        </View>

        <View style={styles.center}>
          <Text
            style={[
              styles.month,
              {
                color: colors.text,
              },
            ]}
          >
            {formatMonthLabel(item.month)}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textMuted,
              },
            ]}
          >
            {privacyMode
              ? 'Valores ocultos'
              : meta.label}
          </Text>
        </View>

        <View style={styles.right}>
          <Text
            style={[
              styles.amount,
              {
                color: privacyMode
                  ? colors.textMuted
                  : meta.color,
              },
            ]}
          >
            {privacyMode
              ? 'R$ ••••••'
              : formatCurrency(item.totalAmount)}
          </Text>

          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={['top']}
    >
      <ScreenHeader title="Meses" />

      {initialLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.month}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text
              style={[
                styles.empty,
                {
                  color: colors.textMuted,
                },
              ]}
            >
              Nenhum mês encontrado
            </Text>
          }
          ListFooterComponent={
            loading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: 20 }}
              />
            ) : (
              <View style={{ height: 30 }} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  list: {
    padding: 16,
    gap: 12,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    marginLeft: 14,
  },

  right: {
    alignItems: 'flex-end',
    gap: 4,
  },

  month: {
    fontSize: 16,
    fontWeight: '700',
  },

  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  amount: {
    fontSize: 15,
    fontWeight: '700',
  },

  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});

export default MonthsScreen;
