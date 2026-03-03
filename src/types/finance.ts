export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Account {
  id: string;
  name: string;
  type: "wallet" | "checking" | "digital" | "investment";
  balance: number;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: "income" | "expense";
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  accountId: string | null;
  creditCardId?: string | null;
  date: string;
  recurring: boolean;
  recurrence?: "daily" | "weekly" | "monthly" | "yearly";
  nextDueDate?: string | null;
  recurrenceCount?: number | null;
  recurrenceCurrent?: number;
  recurrenceGroupId?: string | null;
  recurrencePaused?: boolean;
  installments?: number | null;
  installmentCurrent?: number | null;
  familyMemberId?: string | null;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  principal: number;
  currentValue: number;
  returnRate: number;
  startDate: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  bestPurchaseDay: number;
  color: string;
  usedAmount: number;
  availableLimit: number;
}

export interface CreditCardInvoice {
  id: string;
  creditCardId: string;
  referenceMonth: string;
  total: number;
  paid: boolean;
  paidAt: string | null;
  paidWithAccountId: string | null;
}

export interface FamilyMember {
  id: string;
  name: string;
}

export interface SharedAccount {
  id: string;
  ownerId: string;
  sharedWithUserId: string;
  sharedWithUserName: string;
  sharedWithUserEmail: string;
  accountId: string;
  accountName: string;
}

export interface InsightsData {
  upcomingRecurring: { description: string; amount: number; type: string; nextDueDate: string; recurrence: string }[];
  last12MonthsExpenses: { month: string; total: number }[];
  last12MonthsIncome: { month: string; total: number }[];
  averageMonthlyExpense: number;
  averageMonthlyIncome: number;
}
