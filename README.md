# Nexo — Mobile

Aplicativo mobile do **Nexo**, construído com React Native e Expo SDK 54.

## Tecnologias

- **Framework:** React Native 0.81 + Expo SDK 54
- **Linguagem:** TypeScript
- **Gerenciamento de estado:** Zustand
- **Navegação:** React Navigation (Native Stack + Bottom Tabs via PagerView)
- **Gráficos:** react-native-svg (renderização manual)
- **Autenticação biométrica:** expo-local-authentication
- **Notificações push:** expo-notifications
- **Armazenamento local:** AsyncStorage

## Estrutura do projeto

```
src/
├── components/
│   ├── BalanceCard.tsx
│   ├── CategoryLineChart.tsx
│   ├── ConfirmDialog.tsx
│   ├── CurrencyInput.tsx
│   ├── FormModal.tsx
│   ├── InputField.tsx
│   ├── MonthlyChart.tsx
│   ├── PillButton.tsx
│   ├── ProgressBar.tsx
│   ├── ScreenHeader.tsx
│   ├── SpendingChart.tsx
│   ├── SpendingInsights.tsx
│   └── StatCard.tsx
├── lib/
│   └── finance.ts
├── navigation/
│   └── index.tsx
├── screens/
│   ├── AccountsScreen.tsx
│   ├── BiometricLockScreen.tsx
│   ├── CreditCardDetailScreen.tsx
│   ├── CreditCardsScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── LoginScreen.tsx
│   ├── ManageCategoriesScreen.tsx
│   ├── ManageGoalsScreen.tsx
│   ├── ManageInvestmentsScreen.tsx
│   ├── ManageRecurrencesScreen.tsx
│   ├── MoreScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── TransactionFormScreen.tsx
│   ├── TransactionsScreen.tsx
│   └── TransferScreen.tsx
├── services/
│   ├── api.ts
│   └── notifications.ts
├── store/
│   ├── useAuthStore.ts
│   └── useFinanceStore.ts
├── theme/
│   ├── colors.ts
│   └── ThemeProvider.tsx
└── types/
    └── finance.ts
```

## Como rodar

```bash
npm install
npm start
npm run android
npm run ios
```

## Funcionalidades

- **Dashboard** com saldo consolidado, gráficos de gastos e insights
- **Contas bancárias** (corrente, poupança, digital, investimentos)
- **Transações** com categorização, filtros e busca
- **Cartões de crédito** com controle de faturas, parcelas e limite
- **Transferências** entre contas
- **Recorrências** com processamento automático via cron
- **Metas financeiras** com barra de progresso
- **Investimentos** com acompanhamento de rendimento
- **Categorias** personalizáveis com ícones
- **Modo privacidade** (oculta valores com um toque)
- **Tema claro/escuro**
- **Autenticação biométrica** (Face ID / Fingerprint)
- **Notificações push** para recorrências processadas
- **Gráficos interativos** com filtros de período (7d, 14d, 1m, 1a, customizado)
