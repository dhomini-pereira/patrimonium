import { create } from 'zustand';
import {
  accountsApi,
  transactionsApi,
  categoriesApi,
  investmentsApi,
  goalsApi,
  transfersApi,
  creditCardsApi,
} from '@/services/api';
import type {
  Account,
  Category,
  Transaction,
  Investment,
  Goal,
  CreditCard,
  CreditCardInvoice,
} from '@/types/finance';

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  investments: Investment[];
  goals: Goal[];
  creditCards: CreditCard[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  reset: () => void;

  addAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  getRecurrenceChildren: (parentId: string) => Promise<Transaction[]>;
  toggleRecurrencePause: (id: string, paused: boolean) => Promise<void>;
  deleteRecurrenceWithHistory: (id: string) => Promise<void>;

  transfer: (fromId: string, toId: string, amount: number, description?: string) => Promise<void>;

  addCategory: (data: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addInvestment: (data: Omit<Investment, 'id'>) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;

  addGoal: (data: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  addCreditCard: (data: Omit<CreditCard, 'id' | 'usedAmount' | 'availableLimit'>) => Promise<void>;
  updateCreditCard: (id: string, data: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  getInvoices: (cardId: string) => Promise<CreditCardInvoice[]>;
  payInvoice: (invoiceId: string, accountId: string) => Promise<void>;
}

const initialState = {
  accounts: [] as Account[],
  transactions: [] as Transaction[],
  categories: [] as Category[],
  investments: [] as Investment[],
  goals: [] as Goal[],
  creditCards: [] as CreditCard[],
  loading: false,
  actionLoading: false,
  error: null as string | null,
};

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  ...initialState,

  fetchAll: async () => {
    try {
      set({ loading: true, error: null });
      const [accounts, transactions, categories, investments, goals, creditCards] = await Promise.all([
        accountsApi.getAll(),
        transactionsApi.getAll(),
        categoriesApi.getAll(),
        investmentsApi.getAll(),
        goalsApi.getAll(),
        creditCardsApi.getAll(),
      ]);
      set({ accounts, transactions, categories, investments, goals, creditCards, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Erro ao carregar dados.' });
    }
  },

  reset: () => set(initialState),

  addAccount: async (data) => {
    try {
      set({ actionLoading: true });
      const account = await accountsApi.create(data as any);
      set({ accounts: [...get().accounts, account], actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  updateAccount: async (id, data) => {
    try {
      set({ actionLoading: true });
      const updated = await accountsApi.update(id, data);
      set({ accounts: get().accounts.map((a) => (a.id === id ? updated : a)), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  deleteAccount: async (id) => {
    try {
      set({ actionLoading: true });
      await accountsApi.delete(id);
      set({ accounts: get().accounts.filter((a) => a.id !== id), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  addTransaction: async (data) => {
    try {
      set({ actionLoading: true });
      const tx = await transactionsApi.create(data);
      set({ transactions: [...get().transactions, tx], actionLoading: false });
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  deleteTransaction: async (id) => {
    try {
      set({ actionLoading: true });
      await transactionsApi.delete(id);
      set({ transactions: get().transactions.filter((t) => t.id !== id), actionLoading: false });
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  transfer: async (fromId, toId, amount, description) => {
    try {
      set({ actionLoading: true });
      await transfersApi.create({ fromAccountId: fromId, toAccountId: toId, amount, description });
      set({ actionLoading: false });
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  getRecurrenceChildren: async (parentId) => {
    const children = await transactionsApi.getChildren(parentId);
    return children;
  },

  toggleRecurrencePause: async (id, paused) => {
    try {
      set({ actionLoading: true });
      const updated = await transactionsApi.togglePause(id, paused);
      set({
        transactions: get().transactions.map((t) => (t.id === id ? updated : t)),
        actionLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  deleteRecurrenceWithHistory: async (id) => {
    try {
      set({ actionLoading: true });
      await transactionsApi.deleteRecurrence(id);
      set({
        transactions: get().transactions.filter(
          (t) => t.id !== id && t.recurrenceGroupId !== id,
        ),
        actionLoading: false,
      });
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  addCategory: async (data) => {
    try {
      set({ actionLoading: true });
      const cat = await categoriesApi.create(data as any);
      set({ categories: [...get().categories, cat], actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  updateCategory: async (id, data) => {
    try {
      set({ actionLoading: true });
      const updated = await categoriesApi.update(id, data);
      set({ categories: get().categories.map((c) => (c.id === id ? updated : c)), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  deleteCategory: async (id) => {
    try {
      set({ actionLoading: true });
      await categoriesApi.delete(id);
      set({ categories: get().categories.filter((c) => c.id !== id), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  addInvestment: async (data) => {
    try {
      set({ actionLoading: true });
      const inv = await investmentsApi.create(data);
      set({ investments: [...get().investments, inv], actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  updateInvestment: async (id, data) => {
    try {
      set({ actionLoading: true });
      const updated = await investmentsApi.update(id, data);
      set({ investments: get().investments.map((i) => (i.id === id ? updated : i)), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  deleteInvestment: async (id) => {
    try {
      set({ actionLoading: true });
      await investmentsApi.delete(id);
      set({ investments: get().investments.filter((i) => i.id !== id), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  addGoal: async (data) => {
    try {
      set({ actionLoading: true });
      const goal = await goalsApi.create(data);
      set({ goals: [...get().goals, goal], actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  updateGoal: async (id, data) => {
    try {
      set({ actionLoading: true });
      const updated = await goalsApi.update(id, data);
      set({ goals: get().goals.map((g) => (g.id === id ? updated : g)), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  deleteGoal: async (id) => {
    try {
      set({ actionLoading: true });
      await goalsApi.delete(id);
      set({ goals: get().goals.filter((g) => g.id !== id), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  addCreditCard: async (data) => {
    try {
      set({ actionLoading: true });
      const card = await creditCardsApi.create(data);
      set({ creditCards: [...get().creditCards, card], actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  updateCreditCard: async (id, data) => {
    try {
      set({ actionLoading: true });
      const updated = await creditCardsApi.update(id, data);
      set({ creditCards: get().creditCards.map((c) => (c.id === id ? updated : c)), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  deleteCreditCard: async (id) => {
    try {
      set({ actionLoading: true });
      await creditCardsApi.delete(id);
      set({ creditCards: get().creditCards.filter((c) => c.id !== id), actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  getInvoices: async (cardId) => {
    return await creditCardsApi.getInvoices(cardId);
  },

  payInvoice: async (invoiceId, accountId) => {
    try {
      set({ actionLoading: true });
      await creditCardsApi.payInvoice(invoiceId, accountId);
      // Refetch all to update account balances and credit card used amounts
      const [accounts, creditCards] = await Promise.all([
        accountsApi.getAll(),
        creditCardsApi.getAll(),
      ]);
      set({ accounts, creditCards, actionLoading: false });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },

  updateTransaction: async (id, data) => {
    try {
      set({ actionLoading: true });
      const updated = await transactionsApi.update(id, data);
      set({ transactions: get().transactions.map((t) => (t.id === id ? updated : t)), actionLoading: false });
      const [accounts, creditCards] = await Promise.all([
        accountsApi.getAll(),
        creditCardsApi.getAll(),
      ]);
      set({ accounts, creditCards });
    } catch (err: any) {
      set({ error: err.message, actionLoading: false });
      throw err;
    }
  },
}));
