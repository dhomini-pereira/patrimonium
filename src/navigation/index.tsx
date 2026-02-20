import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View, TouchableOpacity, Text, StyleSheet as NavStyles } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PagerView from 'react-native-pager-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { registerForPushNotifications } from '@/services/notifications';

import LoginScreen from '@/screens/LoginScreen';
import BiometricLockScreen from '@/screens/BiometricLockScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import TransactionsScreen from '@/screens/TransactionsScreen';
import AccountsScreen from '@/screens/AccountsScreen';
import MoreScreen from '@/screens/MoreScreen';
import ManageGoalsScreen from '@/screens/ManageGoalsScreen';
import ManageCategoriesScreen from '@/screens/ManageCategoriesScreen';
import ManageInvestmentsScreen from '@/screens/ManageInvestmentsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import TransactionFormScreen from '@/screens/TransactionFormScreen';
import TransferScreen from '@/screens/TransferScreen';
import ManageRecurrencesScreen from '@/screens/ManageRecurrencesScreen';
import CreditCardsScreen from '@/screens/CreditCardsScreen';
import CreditCardDetailScreen from '@/screens/CreditCardDetailScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  ManageGoals: undefined;
  ManageCategories: undefined;
  ManageInvestments: undefined;
  ManageRecurrences: undefined;
  Profile: undefined;
  TransactionForm: { transactionId?: string } | undefined;
  Transfer: undefined;
  CreditCards: undefined;
  CreditCardDetail: { cardId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Accounts: undefined;
  More: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const tabs = [
  { key: 'Dashboard', label: 'Início', icon: 'grid-outline' as const },
  { key: 'Transactions', label: 'Transações', icon: 'swap-horizontal-outline' as const },
  { key: 'Accounts', label: 'Contas', icon: 'wallet-outline' as const },
  { key: 'More', label: 'Mais', icon: 'menu-outline' as const },
];

const tabScreens = [DashboardScreen, TransactionsScreen, AccountsScreen, MoreScreen];

const TabNavigator = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);

  const onPageSelected = (e: any) => {
    setActiveTab(e.nativeEvent.position);
  };

  const goToPage = (index: number) => {
    pagerRef.current?.setPage(index);
    setActiveTab(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        {tabScreens.map((Screen, index) => (
          <View key={tabs[index].key} style={{ flex: 1 }}>
            <Screen />
          </View>
        ))}
      </PagerView>

      {/* Custom Tab Bar */}
      <View
        style={[
          tabBarStyles.container,
          {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => goToPage(index)}
              style={tabBarStyles.tab}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  tabBarStyles.label,
                  { color: isActive ? colors.primary : colors.textMuted },
                  isActive && tabBarStyles.labelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const tabBarStyles = NavStyles.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '600',
  },
});

const AppNavigation = () => {
  const { colors, dark } = useTheme();
  const {
    isAuthenticated,
    biometricEnabled,
    biometricLocked,
    checkSession,
    lockApp,
    handleReturnFromBackground,
    restoreSession,
  } = useAuthStore();
  const { fetchAll, reset } = useFinanceStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
      registerForPushNotifications();
    } else {
      reset();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
        const valid = checkSession();
        if (!valid) return;
        handleReturnFromBackground();
      } else if (nextState === 'background' || nextState === 'inactive') {
        lockApp();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.surfaceBorder,
    },
  };

  const showBiometricLock = isAuthenticated && biometricEnabled && biometricLocked;
  const showLogin = !isAuthenticated;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {showLogin ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ManageGoals"
              component={ManageGoalsScreen}
              options={{ title: 'Gerenciar Metas' }}
            />
            <Stack.Screen
              name="ManageCategories"
              component={ManageCategoriesScreen}
              options={{ title: 'Gerenciar Categorias' }}
            />
            <Stack.Screen
              name="ManageInvestments"
              component={ManageInvestmentsScreen}
              options={{ title: 'Gerenciar Investimentos' }}
            />
            <Stack.Screen
              name="ManageRecurrences"
              component={ManageRecurrencesScreen}
              options={{ title: 'Recorrências' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Perfil' }}
            />
            <Stack.Screen
              name="TransactionForm"
              component={TransactionFormScreen}
              options={{ title: 'Nova Transação', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Transfer"
              component={TransferScreen}
              options={{ title: 'Transferência', presentation: 'modal' }}
            />
            <Stack.Screen
              name="CreditCards"
              component={CreditCardsScreen}
              options={{ title: 'Cartões de Crédito' }}
            />
            <Stack.Screen
              name="CreditCardDetail"
              component={CreditCardDetailScreen}
              options={{ title: 'Detalhes do Cartão' }}
            />
          </>
        )}
      </Stack.Navigator>

      {/* Biometric lock overlay — mantém navegação montada por baixo */}
      {showBiometricLock && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <BiometricLockScreen />
        </View>
      )}
    </NavigationContainer>
  );
};

export default AppNavigation;
